import { analyticsService } from './analyticsService.js';
import { sanitizeCsvCell } from './csvParserService.js';

export class ReportExportService {
  /**
   * Generates a fully compliant, injection-sanitized RFC 4180 CSV export for any of the 7 supported reports.
   */
  public async generateReportCsv(
    reportType: string,
    options: {
      search?: string;
      startDate?: Date;
      endDate?: Date;
      maxLimit?: number;
    }
  ): Promise<{ csvContent: string; fileName: string; rowCount: number }> {
    const maxLimit = options.maxLimit || 5000;
    const { data, reportMetadata } = await analyticsService.getReportData(reportType, {
      page: 1,
      limit: maxLimit,
      search: options.search,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const lines: string[] = [];

    // Header comment metadata
    lines.push(`# LibTrack Library Management System — ${reportMetadata.reportType}`);
    lines.push(`# Generated At: ${reportMetadata.generatedAt}`);
    lines.push(`# Scope: ${reportMetadata.filterSummary}`);
    lines.push(`# Records Exported: ${data.length}`);
    lines.push(''); // Blank line before CSV column headers

    if (data.length === 0) {
      lines.push('"No records found for the selected criteria."');
      const timestamp = new Date().toISOString().slice(0, 10);
      return {
        csvContent: lines.join('\r\n'),
        fileName: `libtrack-${reportType}-${timestamp}.csv`,
        rowCount: 0,
      };
    }

    // Determine columns dynamically from first data object
    const headers = Object.keys(data[0]);
    const headerRow = headers.map((h) => sanitizeCsvCell(this.formatColumnHeader(h))).join(',');
    lines.push(headerRow);

    // Data rows
    for (const row of data) {
      const rowLine = headers.map((key) => sanitizeCsvCell(row[key])).join(',');
      lines.push(rowLine);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `libtrack-${reportType}-${timestamp}.csv`;

    return {
      csvContent: lines.join('\r\n'),
      fileName,
      rowCount: data.length,
    };
  }

  private formatColumnHeader(key: string): string {
    // Convert camelCase to Title Case e.g. "totalPhysicalCopies" -> "Total Physical Copies"
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}

export const reportExportService = new ReportExportService();
