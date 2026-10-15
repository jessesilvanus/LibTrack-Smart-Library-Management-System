import mongoose, { Document, Schema } from 'mongoose';

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
export type MemberType = 'STUDENT' | 'FACULTY' | 'STAFF';

export interface IMember extends Document {
  memberId: string;
  fullName: string;
  email: string;
  department: string;
  contactNumber?: string;
  memberType: MemberType;
  maxBorrowLimit: number;
  membershipStatus: MembershipStatus;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
  {
    memberId: {
      type: String,
      required: [true, 'Member / Student ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    memberType: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'STAFF'],
      default: 'STUDENT',
      index: true,
    },
    maxBorrowLimit: {
      type: Number,
      default: 4,
      min: [1, 'Borrowing quota must be at least 1'],
    },
    membershipStatus: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

memberSchema.index({ fullName: 'text', memberId: 'text', email: 'text' });
memberSchema.index({ isArchived: 1, membershipStatus: 1, department: 1 });

export const Member = mongoose.model<IMember>('Member', memberSchema);
