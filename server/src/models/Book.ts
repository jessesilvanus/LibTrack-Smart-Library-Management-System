import mongoose, { Document, Schema } from 'mongoose';

export interface IBook extends Document {
  title: string;
  isbn: string;
  authors: string[];
  category: string;
  publisher?: string;
  publicationYear?: number;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      index: true,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    authors: {
      type: [String],
      required: [true, 'At least one author is required'],
      validate: {
        validator: (val: string[]) => Array.isArray(val) && val.length > 0,
        message: 'A book must have at least one author',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    publisher: {
      type: String,
      trim: true,
    },
    publicationYear: {
      type: Number,
      min: [1400, 'Year cannot be earlier than 1400'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in future'],
    },
    shelfLocation: {
      type: String,
      required: [true, 'Shelf location is required'],
      trim: true,
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies count is required'],
      min: [0, 'Total copies cannot be negative'],
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: [true, 'Available copies count is required'],
      min: [0, 'Available copies cannot be negative'],
      default: 1,
      validate: {
        validator: function (this: IBook, val: number) {
          return val <= this.totalCopies;
        },
        message: 'Available copies cannot exceed total copies',
      },
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

// Compound text index for title, authors, and category search
bookSchema.index({ title: 'text', category: 'text', authors: 'text' });
bookSchema.index({ isArchived: 1, category: 1, availableCopies: 1 });

export const Book = mongoose.model<IBook>('Book', bookSchema);
