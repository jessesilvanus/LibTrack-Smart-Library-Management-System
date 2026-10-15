import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType = 'DUE_SOON' | 'FIRST_OVERDUE' | 'REPEAT_OVERDUE' | 'TEST';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface IDeliveryMetadata {
  messageId?: string;
  response?: string;
  provider?: string;
}

export interface INotification extends Document {
  loan?: Types.ObjectId | null;
  member?: Types.ObjectId | null;
  book?: Types.ObjectId | null;
  notificationType: NotificationType;
  recipientEmail: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  status: DeliveryStatus;
  attemptCount: number;
  errorSummary?: string | null;
  idempotencyKey: string;
  deliveryMetadata?: IDeliveryMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    loan: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      default: null,
      index: true,
    },
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
      index: true,
    },
    book: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
      index: true,
    },
    notificationType: {
      type: String,
      enum: ['DUE_SOON', 'FIRST_OVERDUE', 'REPEAT_OVERDUE', 'TEST'],
      required: [true, 'Notification type is required'],
      index: true,
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorSummary: {
      type: String,
      trim: true,
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      trim: true,
      index: true,
    },
    deliveryMetadata: {
      messageId: { type: String, trim: true },
      response: { type: String, trim: true },
      provider: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound indexes
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ notificationType: 1, createdAt: -1 });
notificationSchema.index({ loan: 1, notificationType: 1 });
notificationSchema.index({ member: 1, createdAt: -1 });
notificationSchema.index({ recipientEmail: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
