import mongoose, { Document, Schema } from 'mongoose';

export type ImportType = 'BOOKS' | 'MEMBERS';
export type JobStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'READY'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';
export type ConflictPolicy = 'SKIP_DUPLICATES' | 'REJECT_CONFLICTS' | 'UPDATE_EXISTING';

export interface IRowError {
  rowNumber: number;
  field: string;
  code: string;
  message: string;
  rawValue?: string;
}

export interface IImportJob extends Document {
  jobId: string;
  importType: ImportType;
  fileName: string;
  fileSize: number;
  submittedBy: string;
  status: JobStatus;
  conflictPolicy: ConflictPolicy;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  potentialDuplicates: number;
  processedRows: number;
  successfulRows: number;
  skippedRows: number;
  failedRows: number;
  rowErrors: IRowError[];
  previewRows: Array<Record<string, any>>;
  validatedRows?: Array<Record<string, any>>;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const rowErrorSchema = new Schema<IRowError>(
  {
    rowNumber: { type: Number, required: true },
    field: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    rawValue: { type: String, trim: true },
  },
  { _id: false }
);

const importJobSchema = new Schema<IImportJob>(
  {
    jobId: {
      type: String,
      required: [true, 'Job ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    importType: {
      type: String,
      enum: ['BOOKS', 'MEMBERS'],
      required: [true, 'Import type is required'],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    submittedBy: {
      type: String,
      default: 'ADMIN',
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'VALIDATING',
        'READY',
        'PROCESSING',
        'COMPLETED',
        'COMPLETED_WITH_ERRORS',
        'FAILED',
      ],
      default: 'PENDING',
      index: true,
    },
    conflictPolicy: {
      type: String,
      enum: ['SKIP_DUPLICATES', 'REJECT_CONFLICTS', 'UPDATE_EXISTING'],
      default: 'SKIP_DUPLICATES',
    },
    totalRows: { type: Number, default: 0, min: 0 },
    validRows: { type: Number, default: 0, min: 0 },
    invalidRows: { type: Number, default: 0, min: 0 },
    potentialDuplicates: { type: Number, default: 0, min: 0 },
    processedRows: { type: Number, default: 0, min: 0 },
    successfulRows: { type: Number, default: 0, min: 0 },
    skippedRows: { type: Number, default: 0, min: 0 },
    failedRows: { type: Number, default: 0, min: 0 },
    rowErrors: [rowErrorSchema],
    previewRows: [Schema.Types.Mixed],
    validatedRows: [Schema.Types.Mixed],
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes
importJobSchema.index({ status: 1, createdAt: -1 });
importJobSchema.index({ importType: 1, createdAt: -1 });
importJobSchema.index({ createdAt: -1 });

export const ImportJob = mongoose.model<IImportJob>('ImportJob', importJobSchema);
