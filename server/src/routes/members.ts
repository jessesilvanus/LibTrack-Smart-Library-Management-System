import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { isDbConnected } from '../config/db.js';

export const membersRouter = Router();

// Zod Schema for Registering / Updating Members
const memberSchema = z.object({
  memberId: z
    .string()
    .trim()
    .min(1, 'Member ID is required')
    .max(50)
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase()),
  department: z.string().trim().min(2, 'Department is required').max(100),
  contactNumber: z.string().trim().optional(),
  memberType: z.enum(['STUDENT', 'FACULTY', 'STAFF']).default('STUDENT'),
  membershipStatus: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED']).default('ACTIVE'),
  maxBorrowLimit: z.number().int().min(1).max(20).optional(),
});

function checkDb(req: Request, res: Response, next: () => void) {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is disconnected.' },
    });
    return;
  }
  next();
}

membersRouter.use(checkDb);

// GET /api/members — List, Search, Filter, Paginate with Active Loan Counts
membersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || '';
    const department = (req.query.department as string)?.trim() || '';
    const status = (req.query.status as string)?.trim() || 'ALL';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, any> = { isArchived: false };

    if (status !== 'ALL' && ['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) {
      filter.membershipStatus = status;
    }

    if (department && department !== 'All Departments') {
      filter.department = department;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    if (['fullName', 'memberId', 'createdAt', 'department'].includes(sortBy)) {
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1;
    }

    // Single aggregation query to fetch members with active loan counts (avoids N+1 query issue)
    const [result, total, departments, summaryAgg] = await Promise.all([
      Member.aggregate([
        { $match: filter },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'loans',
            let: { memberId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$member', '$$memberId'] },
                      { $eq: ['$status', 'ACTIVE'] },
                    ],
                  },
                },
              },
            ],
            as: 'activeLoans',
          },
        },
        {
          $addFields: {
            currentBorrowedCount: { $size: '$activeLoans' },
          },
        },
        {
          $project: {
            activeLoans: 0, // exclude raw array from table payload
          },
        },
      ]),
      Member.countDocuments(filter),
      Member.distinct('department', { isArchived: false }),
      Member.aggregate([
        { $match: { isArchived: false } },
        {
          $group: {
            _id: null,
            totalMembers: { $sum: 1 },
            activeMembers: {
              $sum: { $cond: [{ $eq: ['$membershipStatus', 'ACTIVE'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Count distinct members who currently have active loans
    const borrowingMembersCount = (
      await Loan.distinct('member', { status: 'ACTIVE' })
    ).length;

    const summary = summaryAgg.length > 0 ? summaryAgg[0] : { totalMembers: 0, activeMembers: 0 };

    res.json({
      success: true,
      data: {
        members: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        summary: {
          totalMembers: summary.totalMembers,
          activeMembers: summary.activeMembers,
          borrowingMembersCount,
          departments: departments.sort(),
        },
      },
    });
  } catch (err: unknown) {
    console.error('[Members GET Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_MEMBERS_FAILED', message: 'Failed to retrieve member directory.' },
    });
  }
});

// GET /api/members/:id — Single member profile with active loans
membersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid member ID.' } });
      return;
    }

    const [member, activeLoans, totalHistoricalLoans] = await Promise.all([
      Member.findById(req.params.id).lean(),
      Loan.find({ member: req.params.id, status: 'ACTIVE' })
        .populate('book', 'title isbn category shelfLocation')
        .lean(),
      Loan.countDocuments({ member: req.params.id }),
    ]);

    if (!member) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found.' } });
      return;
    }

    res.json({
      success: true,
      data: {
        member,
        activeLoans,
        totalHistoricalLoans,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_MEMBER_FAILED', message: 'Failed to retrieve member details.' },
    });
  }
});

// POST /api/members — Register new member with uniqueness check
membersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validated = memberSchema.parse(req.body);

    // 1. Check duplicate Member ID
    const existingId = await Member.findOne({
      memberId: validated.memberId,
      isArchived: false,
    });
    if (existingId) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_MEMBER_ID',
          message: `Member ID "${validated.memberId}" is already assigned to "${existingId.fullName}".`,
        },
      });
      return;
    }

    // 2. Check duplicate Email
    const existingEmail = await Member.findOne({
      email: validated.email,
      isArchived: false,
    });
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_EMAIL',
          message: `Email address "${validated.email}" is already registered.`,
        },
      });
      return;
    }

    const defaultLimit = validated.maxBorrowLimit || (validated.memberType === 'FACULTY' ? 10 : 4);

    const newMember = new Member({
      ...validated,
      maxBorrowLimit: defaultLimit,
      isArchived: false,
    });

    await newMember.save();

    res.status(201).json({
      success: true,
      data: newMember,
      message: 'Member registered successfully.',
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors[0]?.message || 'Validation error',
          details: err.flatten(),
        },
      });
      return;
    }
    console.error('[Add Member Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_MEMBER_FAILED', message: 'Failed to register member.' },
    });
  }
});

// PUT /api/members/:id — Update member profile
membersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid member ID.' } });
      return;
    }

    const validated = memberSchema.parse(req.body);

    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found.' } });
      return;
    }

    // Check Member ID uniqueness if changed
    if (validated.memberId !== member.memberId) {
      const duplicateId = await Member.findOne({
        memberId: validated.memberId,
        _id: { $ne: member._id },
        isArchived: false,
      });
      if (duplicateId) {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_MEMBER_ID',
            message: `Member ID "${validated.memberId}" is already used by "${duplicateId.fullName}".`,
          },
        });
        return;
      }
    }

    // Check Email uniqueness if changed
    if (validated.email !== member.email) {
      const duplicateEmail = await Member.findOne({
        email: validated.email,
        _id: { $ne: member._id },
        isArchived: false,
      });
      if (duplicateEmail) {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: `Email "${validated.email}" is already used by "${duplicateEmail.fullName}".`,
          },
        });
        return;
      }
    }

    // If changing to SUSPENDED or EXPIRED, warn/check active loans
    if (validated.membershipStatus !== 'ACTIVE') {
      const activeLoansCount = await Loan.countDocuments({
        member: member._id,
        status: 'ACTIVE',
      });
      if (activeLoansCount > 0 && validated.membershipStatus === 'EXPIRED') {
        // Allow status update but note active loans
      }
    }

    member.memberId = validated.memberId;
    member.fullName = validated.fullName;
    member.email = validated.email;
    member.department = validated.department;
    member.contactNumber = validated.contactNumber;
    member.memberType = validated.memberType;
    member.membershipStatus = validated.membershipStatus;
    if (validated.maxBorrowLimit) {
      member.maxBorrowLimit = validated.maxBorrowLimit;
    }

    await member.save();

    res.json({
      success: true,
      data: member,
      message: 'Member details updated successfully.',
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors[0]?.message || 'Validation error',
          details: err.flatten(),
        },
      });
      return;
    }
    console.error('[Update Member Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_MEMBER_FAILED', message: 'Failed to update member record.' },
    });
  }
});

// DELETE /api/members/:id — Archive member with active loan guard
membersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid member ID.' } });
      return;
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found.' } });
      return;
    }

    // Guard: Prevent archiving or deleting member with active loans
    const activeLoansCount = await Loan.countDocuments({
      member: member._id,
      status: 'ACTIVE',
    });

    if (activeLoansCount > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ACTIVE_LOANS_EXIST',
          message: `Cannot archive member "${member.fullName}". They currently have ${activeLoansCount} book(s) in their possession. All books must be returned first.`,
        },
      });
      return;
    }

    member.isArchived = true;
    member.membershipStatus = 'EXPIRED';
    await member.save();

    res.json({
      success: true,
      message: `Member "${member.fullName}" archived successfully. Historical borrowing records are preserved.`,
    });
  } catch (err: unknown) {
    console.error('[Delete Member Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_MEMBER_FAILED', message: 'Failed to archive member.' },
    });
  }
});

// GET /api/members/:id/history — Full borrowing history for a specific member
membersRouter.get('/:id/history', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid member ID.' } });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find({ member: req.params.id })
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('book', 'title isbn category shelfLocation')
        .lean(),
      Loan.countDocuments({ member: req.params.id }),
    ]);

    res.json({
      success: true,
      data: {
        loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_HISTORY_FAILED', message: 'Failed to retrieve member borrowing history.' },
    });
  }
});
