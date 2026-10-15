import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { IRowError } from '../models/ImportJob.js';
import { ParsedCsvRow } from './csvParserService.js';

export interface ValidatedBookRecord {
  rowNumber: number;
  title: string;
  isbn: string;
  normalizedIsbn: string;
  authors: string[];
  category: string;
  publisher?: string;
  publicationYear?: number;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  isExistingInDb: boolean;
  existingId?: string;
}

export interface ValidatedMemberRecord {
  rowNumber: number;
  memberId: string;
  fullName: string;
  email: string;
  department: string;
  contactNumber?: string;
  memberType: 'STUDENT' | 'FACULTY' | 'STAFF';
  maxBorrowLimit: number;
  membershipStatus: 'ACTIVE';
  isExistingInDb: boolean;
  existingId?: string;
}

export interface ValidationSummary<T> {
  totalRows: number;
  validRows: T[];
  errors: IRowError[];
  potentialDuplicates: number;
}

export class ImportValidationService {
  /**
   * Normalizes an ISBN string (removes hyphens, spaces, uppercase)
   */
  public normalizeIsbn(isbn: string | undefined): string {
    if (!isbn) return '';
    return isbn.replace(/[-\s]/g, '').toUpperCase().trim();
  }

  /**
   * Validates parsed Books CSV rows against schema, business rules, and database constraints
   */
  public async validateBooks(rows: ParsedCsvRow[]): Promise<ValidationSummary<ValidatedBookRecord>> {
    const validRows: ValidatedBookRecord[] = [];
    const errors: IRowError[] = [];
    const currentYear = new Date().getFullYear();

    // In-file duplicate tracking
    const seenIsbnsInFile = new Map<string, number>();
    let duplicateCount = 0;

    // 1. Gather all normalized ISBNs to batch-query existing database records in one roundtrip
    const candidateIsbns = rows
      .map((r) => this.normalizeIsbn(r.data.isbn))
      .filter((isbn) => isbn.length > 0);

    const existingBooks = await Book.find({
      isbn: { $in: candidateIsbns },
      isArchived: false,
    }).select('_id isbn totalCopies availableCopies');

    const existingBookMap = new Map<string, any>();
    for (const b of existingBooks) {
      existingBookMap.set(this.normalizeIsbn(b.isbn), b);
    }

    // 2. Validate row by row
    for (const row of rows) {
      const rowErrors: IRowError[] = [];
      const d = row.data;

      // Title
      const title = (d.title || '').trim();
      if (!title) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'title',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Book title is mandatory and cannot be blank.',
          rawValue: d.title,
        });
      } else if (title.length > 300) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'title',
          code: 'FIELD_TOO_LONG',
          message: 'Book title cannot exceed 300 characters.',
          rawValue: title,
        });
      }

      // ISBN
      const rawIsbn = (d.isbn || '').trim();
      const normalizedIsbn = this.normalizeIsbn(rawIsbn);
      if (!rawIsbn) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'isbn',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'ISBN is mandatory and cannot be blank.',
          rawValue: d.isbn,
        });
      } else if (normalizedIsbn.length !== 10 && normalizedIsbn.length !== 13) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'isbn',
          code: 'INVALID_ISBN_FORMAT',
          message: 'ISBN must be a valid 10-digit or 13-digit standard identifier.',
          rawValue: rawIsbn,
        });
      }

      // Within-file duplicate ISBN check
      if (normalizedIsbn) {
        if (seenIsbnsInFile.has(normalizedIsbn)) {
          duplicateCount++;
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'isbn',
            code: 'DUPLICATE_IN_FILE',
            message: `Duplicate ISBN "${rawIsbn}" detected within this file (first seen at row ${seenIsbnsInFile.get(
              normalizedIsbn
            )}).`,
            rawValue: rawIsbn,
          });
        } else {
          seenIsbnsInFile.set(normalizedIsbn, row.rowNumber);
        }
      }

      // Authors
      const rawAuthors = (d.authors || '').trim();
      let authorsList: string[] = [];
      if (!rawAuthors) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'authors',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Author is mandatory. Multiple authors may be separated by commas.',
          rawValue: d.authors,
        });
      } else {
        authorsList = rawAuthors
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0);

        if (authorsList.length === 0) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'authors',
            code: 'INVALID_AUTHORS',
            message: 'Please provide at least one valid author name.',
            rawValue: rawAuthors,
          });
        }
      }

      // Category
      const category = (d.category || 'General Engineering').trim();

      // Publisher
      const publisher = d.publisher ? d.publisher.trim() : undefined;

      // Publication Year
      let publicationYear: number | undefined;
      if (d.publicationyear && d.publicationyear.trim().length > 0) {
        const parsedYear = parseInt(d.publicationyear.trim(), 10);
        if (isNaN(parsedYear) || parsedYear < 1000 || parsedYear > currentYear + 1) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'publicationYear',
            code: 'INVALID_YEAR',
            message: `Publication year must be a valid integer between 1000 and ${currentYear + 1}.`,
            rawValue: d.publicationyear,
          });
        } else {
          publicationYear = parsedYear;
        }
      }

      // Shelf Location
      const shelfLocation = (d.shelflocation || 'General Stacks').trim();

      // Total Copies
      const rawCopies = (d.totalcopies || '').trim();
      let totalCopies = 1;
      if (!rawCopies) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'totalCopies',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Total copies count is required.',
          rawValue: d.totalcopies,
        });
      } else {
        const parsedCopies = parseInt(rawCopies, 10);
        if (isNaN(parsedCopies) || parsedCopies < 1 || parsedCopies > 1000) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'totalCopies',
            code: 'INVALID_COPIES_RANGE',
            message: 'Total copies must be a positive integer between 1 and 1,000.',
            rawValue: rawCopies,
          });
        } else {
          totalCopies = parsedCopies;
        }
      }

      // Check Database Existence
      const existingDbBook = existingBookMap.get(normalizedIsbn);
      if (existingDbBook) {
        duplicateCount++;
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push({
          rowNumber: row.rowNumber,
          title,
          isbn: rawIsbn,
          normalizedIsbn,
          authors: authorsList,
          category,
          publisher,
          publicationYear,
          shelfLocation,
          totalCopies,
          availableCopies: totalCopies,
          isExistingInDb: Boolean(existingDbBook),
          existingId: existingDbBook?._id?.toString(),
        });
      }
    }

    return {
      totalRows: rows.length,
      validRows,
      errors,
      potentialDuplicates: duplicateCount,
    };
  }

  /**
   * Validates parsed Members CSV rows against schema, institutional rules, and database constraints
   */
  public async validateMembers(rows: ParsedCsvRow[]): Promise<ValidationSummary<ValidatedMemberRecord>> {
    const validRows: ValidatedMemberRecord[] = [];
    const errors: IRowError[] = [];

    // In-file duplicate tracking
    const seenMemberIdsInFile = new Map<string, number>();
    const seenEmailsInFile = new Map<string, number>();
    let duplicateCount = 0;

    // Gather candidate member IDs and emails for single batch query
    const candidateMemberIds = rows
      .map((r) => (r.data.memberid || '').toUpperCase().trim())
      .filter((id) => id.length > 0);

    const candidateEmails = rows
      .map((r) => (r.data.email || '').toLowerCase().trim())
      .filter((em) => em.length > 0);

    const existingMembers = await Member.find({
      $or: [{ memberId: { $in: candidateMemberIds } }, { email: { $in: candidateEmails } }],
      isArchived: false,
    }).select('_id memberId email department memberType maxBorrowLimit');

    const existingMemberIdMap = new Map<string, any>();
    const existingEmailMap = new Map<string, any>();
    for (const m of existingMembers) {
      existingMemberIdMap.set(m.memberId.toUpperCase(), m);
      existingEmailMap.set(m.email.toLowerCase(), m);
    }

    for (const row of rows) {
      const rowErrors: IRowError[] = [];
      const d = row.data;

      // Member ID
      const memberId = (d.memberid || '').toUpperCase().trim();
      if (!memberId) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'memberId',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Member / Student ID is mandatory.',
          rawValue: d.memberid,
        });
      } else if (!/^[A-Z0-9_\-\.]{3,30}$/.test(memberId)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'memberId',
          code: 'INVALID_MEMBER_ID',
          message: 'Member ID must be 3-30 alphanumeric characters (hyphens and dots allowed).',
          rawValue: memberId,
        });
      } else if (seenMemberIdsInFile.has(memberId)) {
        duplicateCount++;
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'memberId',
          code: 'DUPLICATE_IN_FILE',
          message: `Duplicate Member ID "${memberId}" detected within this file (first seen at row ${seenMemberIdsInFile.get(
            memberId
          )}).`,
          rawValue: memberId,
        });
      } else {
        seenMemberIdsInFile.set(memberId, row.rowNumber);
      }

      // Full Name
      const fullName = (d.fullname || '').trim();
      if (!fullName) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'fullName',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Full Name is mandatory and cannot be blank.',
          rawValue: d.fullname,
        });
      } else if (fullName.length > 100) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'fullName',
          code: 'FIELD_TOO_LONG',
          message: 'Full Name cannot exceed 100 characters.',
          rawValue: fullName,
        });
      }

      // Email
      const email = (d.email || '').toLowerCase().trim();
      if (!email) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'email',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Institutional email address is mandatory.',
          rawValue: d.email,
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'email',
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Please provide a valid email format (e.g. name@college.edu).',
          rawValue: email,
        });
      } else if (seenEmailsInFile.has(email)) {
        duplicateCount++;
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'email',
          code: 'DUPLICATE_IN_FILE',
          message: `Duplicate email "${email}" detected within this file (first seen at row ${seenEmailsInFile.get(
            email
          )}).`,
          rawValue: email,
        });
      } else {
        seenEmailsInFile.set(email, row.rowNumber);
      }

      // Department
      const department = (d.department || '').trim();
      if (!department) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'department',
          code: 'REQUIRED_FIELD_MISSING',
          message: 'Department is required.',
          rawValue: d.department,
        });
      }

      // Contact Number
      const contactNumber = d.contactnumber ? d.contactnumber.trim() : undefined;

      // Member Type
      let memberType: 'STUDENT' | 'FACULTY' | 'STAFF' = 'STUDENT';
      if (d.membertype && d.membertype.trim().length > 0) {
        const rawType = d.membertype.trim().toUpperCase();
        if (['STUDENT', 'FACULTY', 'STAFF'].includes(rawType)) {
          memberType = rawType as 'STUDENT' | 'FACULTY' | 'STAFF';
        } else {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'memberType',
            code: 'INVALID_ENUM_VALUE',
            message: 'Membership type must be one of: STUDENT, FACULTY, STAFF.',
            rawValue: d.membertype,
          });
        }
      }

      // Max Borrow Limit
      let maxBorrowLimit = memberType === 'FACULTY' ? 10 : 4;
      if (d.maxborrowlimit && d.maxborrowlimit.trim().length > 0) {
        const parsedLimit = parseInt(d.maxborrowlimit.trim(), 10);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'maxBorrowLimit',
            code: 'INVALID_QUOTA',
            message: 'Borrowing quota must be a positive integer between 1 and 50.',
            rawValue: d.maxborrowlimit,
          });
        } else {
          maxBorrowLimit = parsedLimit;
        }
      }

      // Database Conflict Check
      const existingByMemberId = existingMemberIdMap.get(memberId);
      const existingByEmail = existingEmailMap.get(email);
      const isExisting = Boolean(existingByMemberId || existingByEmail);
      if (isExisting) {
        duplicateCount++;
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push({
          rowNumber: row.rowNumber,
          memberId,
          fullName,
          email,
          department,
          contactNumber,
          memberType,
          maxBorrowLimit,
          membershipStatus: 'ACTIVE',
          isExistingInDb: isExisting,
          existingId: (existingByMemberId || existingByEmail)?._id?.toString(),
        });
      }
    }

    return {
      totalRows: rows.length,
      validRows,
      errors,
      potentialDuplicates: duplicateCount,
    };
  }
}

export const importValidationService = new ImportValidationService();
