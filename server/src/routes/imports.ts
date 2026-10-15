import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ImportJob, ImportType, ConflictPolicy } from '../models/ImportJob.js';
import {
  csvParserService,
  getBooksCsvTemplate,
  getMembersCsvTemplate,
  sanitizeCsvCell,
} from '../services/csvParserService.js';
import { importValidationService } from '../services/importValidationService.js';
import { batchImportService } from '../services/batchImportService.js';
import { adminAuthGuard } from './notifications.js';
import { env } from '../config/env.js';

export const importsRouter = Router();

// Configure Multer for in-memory CSV buffer handling with size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_CSV_UPLOAD_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    // Check filename extension or mimetype
    if (!file.originalname.match(/\.(csv|txt)$/i)) {
      return cb(new Error('Only CSV files (.csv) are supported for bulk data import.'));
    }
    cb(null, true);
  },
});

// ==============================================================================
// 1. Templates Downloads (Public / Librarian Access)
// ==============================================================================
importsRouter.get('/templates/books', (_req: Request, res: Response) => {
  const csvData = getBooksCsvTemplate();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="libtrack_books_template.csv"');
  res.status(200).send(csvData);
});

importsRouter.get('/templates/members', (_req: Request, res: Response) => {
  const csvData = getMembersCsvTemplate();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="libtrack_members_template.csv"');
  res.status(200).send(csvData);
});

// ==============================================================================
// 2. POST /api/imports/validate — Upload, Parse & Pre-Validate CSV
// ==============================================================================
importsRouter.post(
  '/validate',
  adminAuthGuard,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let rawCsvContent: string | Buffer;
      let originalFileName: string;
      let fileSize: number;
      let importType: ImportType;

      // Handle either multipart file upload or JSON payload
      if (req.file) {
        rawCsvContent = req.file.buffer;
        originalFileName = req.file.originalname;
        fileSize = req.file.size;
        importType = (req.body.importType || 'BOOKS').toUpperCase() as ImportType;
      } else if (req.body.csvContent) {
        rawCsvContent = req.body.csvContent;
        originalFileName = req.body.fileName || `import_${Date.now()}.csv`;
        fileSize = Buffer.byteLength(req.body.csvContent, 'utf8');
        importType = (req.body.importType || 'BOOKS').toUpperCase() as ImportType;
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'No CSV file or csvContent payload was supplied for import.',
          },
        });
        return;
      }

      if (!['BOOKS', 'MEMBERS'].includes(importType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IMPORT_TYPE',
            message: 'Import type must be either "BOOKS" or "MEMBERS".',
          },
        });
        return;
      }

      // Define header expectations
      const expectedHeaders =
        importType === 'BOOKS'
          ? ['title', 'isbn', 'authors', 'category', 'publisher', 'publicationyear', 'shelflocation', 'totalcopies']
          : ['memberid', 'fullname', 'email', 'department', 'contactnumber', 'membertype', 'maxborrowlimit'];

      const requiredHeaders =
        importType === 'BOOKS'
          ? ['title', 'isbn', 'authors', 'totalcopies']
          : ['memberid', 'fullname', 'email', 'department'];

      // Parse CSV
      const parseResult = csvParserService.parseCsv(rawCsvContent, expectedHeaders, requiredHeaders);

      // Validate according to type
      let validationResult: any;
      if (importType === 'BOOKS') {
        validationResult = await importValidationService.validateBooks(parseResult.rows);
      } else {
        validationResult = await importValidationService.validateMembers(parseResult.rows);
      }

      const jobId = `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Save initial ImportJob record in MongoDB
      const job = new ImportJob({
        jobId,
        importType,
        fileName: originalFileName,
        fileSize,
        submittedBy: (req.headers['x-admin-user'] as string) || 'Librarian Admin',
        status: validationResult.validRows.length > 0 ? 'READY' : 'FAILED',
        totalRows: validationResult.totalRows,
        validRows: validationResult.validRows.length,
        invalidRows: validationResult.errors.length,
        rowErrors: validationResult.errors,
        previewRows: parseResult.rows.slice(0, 10).map((r) => r.data),
        validatedRows: validationResult.validRows,
      });

      await job.save();

      res.status(200).json({
        success: true,
        data: {
          jobId: job.jobId,
          importType: job.importType,
          fileName: job.fileName,
          totalRows: job.totalRows,
          validRowsCount: job.validRows,
          invalidRowsCount: job.invalidRows,
          potentialDuplicates: job.potentialDuplicates,
          previewRows: job.previewRows,
          errors: job.rowErrors,
          status: job.status,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: error?.message || 'Failed to validate uploaded CSV file.',
        },
      });
    }
  }
);

// ==============================================================================
// 3. POST /api/imports/:id/confirm — Execute Batch Insertion
// ==============================================================================
const confirmSchema = z.object({
  conflictPolicy: z.enum(['SKIP_DUPLICATES', 'REJECT_CONFLICTS', 'UPDATE_EXISTING']).default('SKIP_DUPLICATES'),
});

importsRouter.post(
  '/:id/confirm',
  adminAuthGuard,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = confirmSchema.safeParse(req.body);
      const conflictPolicy = parseResult.success ? parseResult.data.conflictPolicy : 'SKIP_DUPLICATES';

      const result = await batchImportService.executeImportJob(req.params.id, conflictPolicy);

      res.status(200).json({
        success: true,
        message: 'Batch import execution completed.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'IMPORT_EXECUTION_ERROR',
          message: error?.message || 'Failed to execute import job.',
        },
      });
    }
  }
);

// ==============================================================================
// 4. GET /api/imports — Paginated Import Jobs History
// ==============================================================================
importsRouter.get('/', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const search = ((req.query.search as string) || '').trim();
    const typeFilter = req.query.type as ImportType | undefined;
    const statusFilter = req.query.status as string | undefined;

    const filter: Record<string, any> = {};

    if (typeFilter && ['BOOKS', 'MEMBERS'].includes(typeFilter)) {
      filter.importType = typeFilter;
    }

    if (
      statusFilter &&
      [
        'PENDING',
        'VALIDATING',
        'READY',
        'PROCESSING',
        'COMPLETED',
        'COMPLETED_WITH_ERRORS',
        'FAILED',
      ].includes(statusFilter)
    ) {
      filter.status = statusFilter;
    }

    if (search) {
      filter.$or = [
        { jobId: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await ImportJob.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    // Project out the heavy validatedRows array for listing efficiency
    const jobs = await ImportJob.find(filter)
      .select('-validatedRows')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 5. GET /api/imports/summary — Import System Metrics
// ==============================================================================
importsRouter.get(
  '/summary',
  adminAuthGuard,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [totalJobs, completedJobs, failedJobs, partialJobs] = await Promise.all([
        ImportJob.countDocuments(),
        ImportJob.countDocuments({ status: 'COMPLETED' }),
        ImportJob.countDocuments({ status: 'FAILED' }),
        ImportJob.countDocuments({ status: 'COMPLETED_WITH_ERRORS' }),
      ]);

      const aggregation = await ImportJob.aggregate([
        {
          $group: {
            _id: null,
            totalImportedRows: { $sum: '$successfulRows' },
            totalFailedRows: { $sum: '$failedRows' },
            totalSkippedRows: { $sum: '$skippedRows' },
          },
        },
      ]);

      const stats = aggregation[0] || {
        totalImportedRows: 0,
        totalFailedRows: 0,
        totalSkippedRows: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          totalJobs,
          completedJobs,
          failedJobs,
          partialJobs,
          totalImportedRows: stats.totalImportedRows,
          totalFailedRows: stats.totalFailedRows,
          totalSkippedRows: stats.totalSkippedRows,
          batchSize: env.IMPORT_BATCH_SIZE,
          maxRowsLimit: env.MAX_CSV_ROWS,
          maxFileSizeMb: Math.round(env.MAX_CSV_UPLOAD_BYTES / (1024 * 1024)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==============================================================================
// 6. GET /api/imports/:id — Single Job Inspection
// ==============================================================================
importsRouter.get('/:id', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await ImportJob.findOne({
      $or: [{ jobId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!job) {
      res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Import job "${req.params.id}" was not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 7. GET /api/imports/:id/error-report — Download Sanitized Error CSV
// ==============================================================================
importsRouter.get(
  '/:id/error-report',
  adminAuthGuard,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await ImportJob.findOne({
        $or: [{ jobId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
      });

      if (!job) {
        res.status(404).json({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Import job was not found.' },
        });
        return;
      }

      if (!job.rowErrors || job.rowErrors.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_ERRORS', message: 'This import job recorded 0 validation or execution errors.' },
        });
        return;
      }

      const headers = ['Row Number', 'Field Name', 'Error Code', 'Error Description', 'Rejected Value'];
      const rows = job.rowErrors.map((err) => [
        String(err.rowNumber),
        err.field,
        err.code,
        err.message,
        err.rawValue || '',
      ]);

      const csvContent = [
        headers.map(sanitizeCsvCell).join(','),
        ...rows.map((r) => r.map(sanitizeCsvCell).join(',')),
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="libtrack_errors_${job.jobId}.csv"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

// ==============================================================================
// 8. POST /api/imports/:id/retry — Retry Failed Records
// ==============================================================================
importsRouter.post(
  '/:id/retry',
  adminAuthGuard,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await batchImportService.retryFailedRecords(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Retry processing completed.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'RETRY_FAILED',
          message: error?.message || 'Failed to retry import job.',
        },
      });
    }
  }
);
