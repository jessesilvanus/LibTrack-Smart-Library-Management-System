import { ImportJob, IImportJob, ConflictPolicy, IRowError } from '../models/ImportJob.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { ValidatedBookRecord, ValidatedMemberRecord } from './importValidationService.js';
import { env } from '../config/env.js';

export interface BatchProcessingResult {
  jobId: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  skippedRows: number;
  failedRows: number;
  errorsCount: number;
}

export class BatchImportService {
  private activeJobs = new Set<string>();

  public isJobActive(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  /**
   * Executes batch processing of a validated import job
   */
  public async executeImportJob(
    jobId: string,
    overridePolicy?: ConflictPolicy
  ): Promise<BatchProcessingResult> {
    if (this.activeJobs.has(jobId)) {
      throw new Error(`Job "${jobId}" is already being processed by another worker.`);
    }
    this.activeJobs.add(jobId);

    try {
      const job = await ImportJob.findOne({ jobId });
      if (!job) {
        throw new Error(`Import job "${jobId}" not found.`);
      }

      if (job.status === 'PROCESSING') {
        throw new Error(`Import job "${jobId}" is currently in progress.`);
      }

      if (!job.validatedRows || job.validatedRows.length === 0) {
        throw new Error(`Import job "${jobId}" has no validated rows to process.`);
      }

      const policy = overridePolicy || job.conflictPolicy;
      job.conflictPolicy = policy;
      job.status = 'PROCESSING';
      job.startedAt = new Date();
      await job.save();

      if (job.importType === 'BOOKS') {
        await this.processBooksBatch(job, policy);
      } else {
        await this.processMembersBatch(job, policy);
      }

      job.completedAt = new Date();
      if (job.failedRows === 0 && job.successfulRows > 0) {
        job.status = 'COMPLETED';
      } else if (job.successfulRows > 0 && job.failedRows > 0) {
        job.status = 'COMPLETED_WITH_ERRORS';
      } else if (job.successfulRows === 0 && job.failedRows > 0) {
        job.status = 'FAILED';
      } else {
        job.status = 'COMPLETED';
      }

      await job.save();

      return {
        jobId: job.jobId,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successfulRows: job.successfulRows,
        skippedRows: job.skippedRows,
        failedRows: job.failedRows,
        errorsCount: job.rowErrors.length,
      };
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Batch execution for Books
   */
  private async processBooksBatch(job: IImportJob, policy: ConflictPolicy): Promise<void> {
    const records = (job.validatedRows as ValidatedBookRecord[]) || [];
    const batchSize = env.IMPORT_BATCH_SIZE;

    let successful = 0;
    let skipped = 0;
    let failed = 0;
    const additionalErrors: IRowError[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize);

      for (const record of chunk) {
        try {
          // Check if book exists by normalized ISBN
          const existing = await Book.findOne({
            isbn: record.isbn,
            isArchived: false,
          });

          if (existing) {
            if (policy === 'SKIP_DUPLICATES') {
              skipped++;
              continue;
            } else if (policy === 'REJECT_CONFLICTS') {
              failed++;
              additionalErrors.push({
                rowNumber: record.rowNumber,
                field: 'isbn',
                code: 'CONFLICT_REJECTED',
                message: `Book with ISBN "${record.isbn}" already exists in the catalog. Conflict policy rejected insertion.`,
                rawValue: record.isbn,
              });
              continue;
            } else if (policy === 'UPDATE_EXISTING') {
              // Calculate difference in copies while guarding against active loans
              const activeLoanCount = await Loan.countDocuments({
                book: existing._id,
                status: { $in: ['ACTIVE', 'OVERDUE'] },
                returnDate: null,
              });

              if (record.totalCopies < activeLoanCount) {
                failed++;
                additionalErrors.push({
                  rowNumber: record.rowNumber,
                  field: 'totalCopies',
                  code: 'BELOW_ACTIVE_LOANS',
                  message: `Cannot update total copies to ${record.totalCopies} because ${activeLoanCount} copies are currently on loan.`,
                  rawValue: String(record.totalCopies),
                });
                continue;
              }

              // Update metadata
              existing.title = record.title;
              existing.authors = record.authors;
              existing.category = record.category;
              if (record.publisher) existing.publisher = record.publisher;
              if (record.publicationYear) existing.publicationYear = record.publicationYear;
              existing.shelfLocation = record.shelfLocation;
              existing.availableCopies = Math.max(0, record.totalCopies - activeLoanCount);
              existing.totalCopies = record.totalCopies;

              await existing.save();
              successful++;
              continue;
            }
          }

          // New book insertion
          await Book.create({
            title: record.title,
            isbn: record.isbn,
            authors: record.authors,
            category: record.category,
            publisher: record.publisher,
            publicationYear: record.publicationYear,
            shelfLocation: record.shelfLocation,
            totalCopies: record.totalCopies,
            availableCopies: record.availableCopies,
            isArchived: false,
          });

          successful++;
        } catch (dbErr: any) {
          failed++;
          additionalErrors.push({
            rowNumber: record.rowNumber,
            field: 'general',
            code: 'DATABASE_WRITE_ERROR',
            message: dbErr?.message || 'Database error occurred during batch write.',
            rawValue: record.isbn,
          });
        }
      }

      // Checkpoint progress to database
      job.processedRows = i + chunk.length;
      job.successfulRows = successful;
      job.skippedRows = skipped;
      job.failedRows = failed;
      if (additionalErrors.length > 0) {
        job.rowErrors.push(...additionalErrors);
        additionalErrors.length = 0; // clear after pushing
      }
      await job.save();
    }
  }

  /**
   * Batch execution for Members
   */
  private async processMembersBatch(job: IImportJob, policy: ConflictPolicy): Promise<void> {
    const records = (job.validatedRows as ValidatedMemberRecord[]) || [];
    const batchSize = env.IMPORT_BATCH_SIZE;

    let successful = 0;
    let skipped = 0;
    let failed = 0;
    const additionalErrors: IRowError[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize);

      for (const record of chunk) {
        try {
          const existing = await Member.findOne({
            $or: [{ memberId: record.memberId }, { email: record.email }],
            isArchived: false,
          });

          if (existing) {
            if (policy === 'SKIP_DUPLICATES') {
              skipped++;
              continue;
            } else if (policy === 'REJECT_CONFLICTS') {
              failed++;
              additionalErrors.push({
                rowNumber: record.rowNumber,
                field: 'memberId',
                code: 'CONFLICT_REJECTED',
                message: `Member with ID "${record.memberId}" or email "${record.email}" already exists.`,
                rawValue: `${record.memberId} / ${record.email}`,
              });
              continue;
            } else if (policy === 'UPDATE_EXISTING') {
              existing.fullName = record.fullName;
              existing.department = record.department;
              if (record.contactNumber) existing.contactNumber = record.contactNumber;
              existing.memberType = record.memberType;
              existing.maxBorrowLimit = record.maxBorrowLimit;

              await existing.save();
              successful++;
              continue;
            }
          }

          // New member insertion
          await Member.create({
            memberId: record.memberId,
            fullName: record.fullName,
            email: record.email,
            department: record.department,
            contactNumber: record.contactNumber,
            memberType: record.memberType,
            maxBorrowLimit: record.maxBorrowLimit,
            membershipStatus: 'ACTIVE',
            isArchived: false,
          });

          successful++;
        } catch (dbErr: any) {
          failed++;
          additionalErrors.push({
            rowNumber: record.rowNumber,
            field: 'general',
            code: 'DATABASE_WRITE_ERROR',
            message: dbErr?.message || 'Database error occurred during batch write.',
            rawValue: record.memberId,
          });
        }
      }

      job.processedRows = i + chunk.length;
      job.successfulRows = successful;
      job.skippedRows = skipped;
      job.failedRows = failed;
      if (additionalErrors.length > 0) {
        job.rowErrors.push(...additionalErrors);
        additionalErrors.length = 0;
      }
      await job.save();
    }
  }

  /**
   * Safe retry: re-processes only the failed records of an eligible job without duplicating successful ones
   */
  public async retryFailedRecords(jobId: string): Promise<BatchProcessingResult> {
    const job = await ImportJob.findOne({ jobId });
    if (!job) {
      throw new Error(`Import job "${jobId}" not found.`);
    }

    if (job.status !== 'COMPLETED_WITH_ERRORS' && job.status !== 'FAILED') {
      throw new Error(`Only failed or partially failed jobs can be retried (current status: ${job.status}).`);
    }

    if (job.failedRows === 0) {
      throw new Error(`Job has 0 failed records to retry.`);
    }

    // Identify failed row numbers from errors
    const failedRowNumbers = new Set(job.rowErrors.map((e) => e.rowNumber));
    const allValidated = job.validatedRows || [];
    const retrySubset = allValidated.filter((r: any) => failedRowNumbers.has(r.rowNumber));

    if (retrySubset.length === 0) {
      throw new Error('No retryable row payloads found in job record.');
    }

    // Create a child retry job or update current job
    job.validatedRows = retrySubset;
    job.totalRows = retrySubset.length;
    job.processedRows = 0;
    job.successfulRows = 0;
    job.failedRows = 0;
    job.skippedRows = 0;
    job.rowErrors = [];
    job.status = 'READY';
    await job.save();

    return this.executeImportJob(job.jobId);
  }
}

export const batchImportService = new BatchImportService();
