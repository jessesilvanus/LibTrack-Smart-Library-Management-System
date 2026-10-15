import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';

export async function ensureSeedData(): Promise<void> {
  try {
    const bookCount = await Book.countDocuments();
    if (bookCount > 0) {
      return; // Database already has catalog data
    }

    console.log('[AutoSeed] Empty database detected. Populating initial academic catalog and members...');

    const booksData = [
      {
        title: 'Introduction to Algorithms (4th Edition)',
        isbn: '978-0262046305',
        authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
        category: 'Computer Science',
        publisher: 'MIT Press',
        publicationYear: 2022,
        shelfLocation: 'Stack CS-04',
        totalCopies: 8,
        availableCopies: 6,
      },
      {
        title: 'Database System Concepts (7th Edition)',
        isbn: '978-0078022159',
        authors: ['Abraham Silberschatz', 'Henry F. Korth', 'S. Sudarshan'],
        category: 'Computer Science',
        publisher: 'McGraw-Hill Education',
        publicationYear: 2019,
        shelfLocation: 'Stack CS-07',
        totalCopies: 6,
        availableCopies: 4,
      },
      {
        title: 'Operating System Concepts (10th Edition)',
        isbn: '978-1119456339',
        authors: ['Abraham Silberschatz', 'Peter B. Galvin', 'Greg Gagne'],
        category: 'Computer Science',
        publisher: 'Wiley',
        publicationYear: 2018,
        shelfLocation: 'Stack CS-02',
        totalCopies: 5,
        availableCopies: 3,
      },
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        isbn: '978-0132350884',
        authors: ['Robert C. Martin'],
        category: 'Software Engineering',
        publisher: 'Prentice Hall',
        publicationYear: 2008,
        shelfLocation: 'Stack SE-01',
        totalCopies: 5,
        availableCopies: 3,
      },
      {
        title: 'Computer Networks (6th Edition)',
        isbn: '978-0133766189',
        authors: ['Andrew S. Tanenbaum', 'David J. Wetherall'],
        category: 'Computer Networks',
        publisher: 'Pearson',
        publicationYear: 2021,
        shelfLocation: 'Stack NET-05',
        totalCopies: 6,
        availableCopies: 5,
      },
      {
        title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
        isbn: '978-0134610993',
        authors: ['Stuart Russell', 'Peter Norvig'],
        category: 'Artificial Intelligence',
        publisher: 'Pearson',
        publicationYear: 2020,
        shelfLocation: 'Stack AI-02',
        totalCopies: 7,
        availableCopies: 5,
      },
    ];
    const insertedBooks = await Book.insertMany(booksData);

    const membersData = [
      {
        memberId: 'STU-2026-101',
        fullName: 'Rahul Sharma',
        email: 'rahul.cs22@college.edu',
        phone: '+91-9876543210',
        memberType: 'STUDENT' as const,
        department: 'Computer Science & Engineering',
        maxBooksAllowed: 4,
        currentLoansCount: 1,
        status: 'ACTIVE' as const,
      },
      {
        memberId: 'STU-2026-102',
        fullName: 'Pooja Hegde',
        email: 'pooja.is22@college.edu',
        phone: '+91-9876543211',
        memberType: 'STUDENT' as const,
        department: 'Information Science & Engineering',
        maxBooksAllowed: 4,
        currentLoansCount: 1,
        status: 'ACTIVE' as const,
      },
      {
        memberId: 'FAC-2026-001',
        fullName: 'Dr. C. V. Raman',
        email: 'prof.raman@college.edu',
        phone: '+91-9876543212',
        memberType: 'FACULTY' as const,
        department: 'Computer Science & Engineering',
        maxBooksAllowed: 10,
        currentLoansCount: 1,
        status: 'ACTIVE' as const,
      },
    ];
    const insertedMembers = await Member.insertMany(membersData);

    const now = new Date();
    const dayMs = 24 * 3600 * 1000;

    const sampleLoans = [
      {
        book: insertedBooks[0]._id,
        member: insertedMembers[0]._id,
        copyIdentifier: 'Copy #1',
        issueDate: new Date(now.getTime() - 10 * dayMs),
        dueDate: new Date(now.getTime() + 4 * dayMs),
        status: 'ACTIVE' as const,
      },
      {
        book: insertedBooks[1]._id,
        member: insertedMembers[1]._id,
        copyIdentifier: 'Copy #1',
        issueDate: new Date(now.getTime() - 18 * dayMs),
        dueDate: new Date(now.getTime() - 4 * dayMs),
        status: 'OVERDUE' as const,
      },
      {
        book: insertedBooks[2]._id,
        member: insertedMembers[2]._id,
        copyIdentifier: 'Copy #1',
        issueDate: new Date(now.getTime() - 25 * dayMs),
        dueDate: new Date(now.getTime() - 5 * dayMs),
        status: 'ACTIVE' as const,
      },
    ];
    await Loan.insertMany(sampleLoans);

    console.log(`[AutoSeed] Successfully populated ${insertedBooks.length} books, ${insertedMembers.length} members, and ${sampleLoans.length} loans.`);
  } catch (err) {
    console.warn('[AutoSeed] Seeding notice:', err);
  }
}
