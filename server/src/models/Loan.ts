import mongoose, { Document, Schema, Types } from 'mongoose';

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export interface IReminderMetadata {
  reminderCount: number;
  lastReminderSentAt: Date | null;
}

export interface ILoan extends Document {
  book: Types.ObjectId;
  member: Types.ObjectId;
  copyIdentifier?: string;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  status: LoanStatus;
  reminderMetadata: IReminderMetadata;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    book: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required'],
      index: true,
    },
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member reference is required'],
      index: true,
    },
    copyIdentifier: {
      type: String,
      trim: true,
      default: 'Copy #1',
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    returnDate: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RETURNED', 'OVERDUE'],
      default: 'ACTIVE',
      index: true,
    },
    reminderMetadata: {
      reminderCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastReminderSentAt: {
        type: Date,
        default: null,
      },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-frequency queries
loanSchema.index({ status: 1, dueDate: 1 });
loanSchema.index({ member: 1, status: 1 });
loanSchema.index({ book: 1, status: 1 });
loanSchema.index({ issueDate: 1, status: 1 });
loanSchema.index({ returnDate: 1, status: 1 });

export const Loan = mongoose.model<ILoan>('Loan', loanSchema);
