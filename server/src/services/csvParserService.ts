import { parse } from 'csv-parse/sync';
import { env } from '../config/env.js';

export interface ParsedCsvRow {
  rowNumber: number;
  data: Record<string, string>;
}

export interface CsvParseResult {
  headers: string[];
  rows: ParsedCsvRow[];
  totalRows: number;
}

/**
 * Escapes values for safe CSV export, preventing Spreadsheet Formula Injection (CWE-1236)
 */
export function sanitizeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val).trim();

  // If the cell begins with dangerous formula triggers (=, +, -, @, tab, CR), prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates official Books CSV Template
 */
export function getBooksCsvTemplate(): string {
  const headers = [
    'title',
    'isbn',
    'authors',
    'category',
    'publisher',
    'publicationyear',
    'shelflocation',
    'totalcopies',
  ];

  const sampleRows = [
    [
      'Computer Networks: A Systems Approach',
      '978-0123850591',
      'Larry L. Peterson, Bruce S. Davie',
      'Computer Science',
      'Morgan Kaufmann',
      '2011',
      'Stack CS-10',
      '5',
    ],
    [
      'Artificial Intelligence: A Modern Approach',
      '978-0136042594',
      'Stuart Russell, Peter Norvig',
      'Computer Science',
      'Pearson',
      '2020',
      'Stack CS-12',
      '6',
    ],
    [
      'Digital Design and Computer Architecture',
      '978-0123944245',
      'David Harris, Sarah Harris',
      'Electronics & Communication',
      'Morgan Kaufmann',
      '2012',
      'Stack EC-03',
      '4',
    ],
  ];

  const csvLines = [
    headers.map(sanitizeCsvCell).join(','),
    ...sampleRows.map((row) => row.map(sanitizeCsvCell).join(',')),
  ];

  return csvLines.join('\r\n');
}

/**
 * Generates official Members CSV Template
 */
export function getMembersCsvTemplate(): string {
  const headers = [
    'memberid',
    'fullname',
    'email',
    'department',
    'contactnumber',
    'membertype',
    'maxborrowlimit',
  ];

  const sampleRows = [
    [
      'STU-2026-1050',
      'Aditi Verma',
      'aditi.verma@college.edu',
      'Computer Science & Engineering',
      '+91-98765-01050',
      'STUDENT',
      '4',
    ],
    [
      'FAC-2026-2050',
      'Prof. Rajesh Kumar',
      'rajesh.kumar@college.edu',
      'Electronics & Communication',
      '+91-98765-02050',
      'FACULTY',
      '10',
    ],
    [
      'STU-2026-1051',
      'Siddharth Nair',
      'siddharth.nair@college.edu',
      'Mechanical Engineering',
      '+91-98765-01051',
      'STUDENT',
      '4',
    ],
  ];

  const csvLines = [
    headers.map(sanitizeCsvCell).join(','),
    ...sampleRows.map((row) => row.map(sanitizeCsvCell).join(',')),
  ];

  return csvLines.join('\r\n');
}

export class CsvParserService {
  /**
   * Parses raw CSV string or Buffer with UTF-8 BOM stripping, header validation, and row limits
   */
  public parseCsv(
    csvContent: string | Buffer,
    expectedHeaders: string[],
    requiredHeaders: string[]
  ): CsvParseResult {
    let contentStr = typeof csvContent === 'string' ? csvContent : csvContent.toString('utf-8');

    // Strip UTF-8 Byte Order Mark (BOM) if present
    if (contentStr.charCodeAt(0) === 0xfeff) {
      contentStr = contentStr.slice(1);
    }

    if (!contentStr || contentStr.trim().length === 0) {
      throw new Error('The uploaded CSV file is empty. Please provide a valid CSV file with data.');
    }

    let records: string[][];
    try {
      records = parse(contentStr, {
        bom: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: false,
      });
    } catch (parseErr: any) {
      throw new Error(`CSV Parsing syntax error: ${parseErr?.message || 'Malformed CSV format'}`);
    }

    if (!records || records.length === 0) {
      throw new Error('The CSV file contains no readable records.');
    }

    // Header extraction & normalization
    const rawHeaders = records[0].map((h) => h.trim().toLowerCase());
    if (rawHeaders.length === 0 || rawHeaders.every((h) => h === '')) {
      throw new Error('The CSV file does not contain a valid header row.');
    }

    // Check for missing required columns
    const normalizedRequired = requiredHeaders.map((h) => h.toLowerCase());
    const missing = normalizedRequired.filter((req) => !rawHeaders.includes(req));
    if (missing.length > 0) {
      throw new Error(
        `Missing required column(s): [${missing.join(', ')}]. Please review the template format.`
      );
    }

    const dataRows = records.slice(1);
    if (dataRows.length === 0) {
      throw new Error('The CSV file has headers but contains zero data rows.');
    }

    if (dataRows.length > env.MAX_CSV_ROWS) {
      throw new Error(
        `File exceeds maximum row limit of ${env.MAX_CSV_ROWS} rows (contains ${dataRows.length} rows). Please split into smaller batch files.`
      );
    }

    // Map each data row to column key-values
    const parsedRows: ParsedCsvRow[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 2; // Row 1 is header, so data starts at line 2
      const rowValues = dataRows[i];
      const rowObj: Record<string, string> = {};

      for (let c = 0; c < rawHeaders.length; c++) {
        const headerKey = rawHeaders[c];
        rowObj[headerKey] = (rowValues[c] || '').trim();
      }

      parsedRows.push({
        rowNumber,
        data: rowObj,
      });
    }

    return {
      headers: rawHeaders,
      rows: parsedRows,
      totalRows: parsedRows.length,
    };
  }
}

export const csvParserService = new CsvParserService();
