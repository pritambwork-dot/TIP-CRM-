/**
 * TIP CRM — Secure & Fault-Resilient CSV Export Utility
 * File: src/lib/csvExport.ts
 *
 * Prevents:
 * 1. CSV injection and malformed quotes corruption.
 * 2. Data URI truncation via standard Blob + URL.createObjectURL.
 * 3. Leaks of internal errors or crashes during file download.
 */

import { clientSafeLogger, mapToSafeErrorMessage } from './safeErrors';

/**
 * Sanitizes a single CSV cell to prevent CSV / Spreadsheet Formula Injection (OWASP)
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', it is prepended with a single quote.
 */
export function sanitizeCsvCell(cell: string | number | boolean | null | undefined): string {
  if (cell === null || cell === undefined) return '""';
  let str = String(cell);

  // Check if trimmed content starts with any formula execution operator
  const trimmed = str.trimStart();
  if (/^[-+=@\t\r]/.test(trimmed)) {
    // Prepend single quote to force Excel/Sheets to treat as literal string
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportToCsv(filename: string, rows: Array<Array<string | number | boolean | null | undefined>>): boolean {
  try {
    if (!rows || rows.length === 0) {
      clientSafeLogger.warn('[CSV Export] No data available for export');
      return false;
    }

    const csvBody = rows
      .map(row => row.map(sanitizeCsvCell).join(','))
      .join('\r\n');

    // Prepend UTF-8 BOM so Excel properly interprets non-ASCII characters
    const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Sanitize filename against directory traversal
    const cleanBasename = filename
      .replace(/[\0\x00-\x1f\x7f]/g, '')
      .replace(/[\\/]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^[.-]+/, '') || 'export';

    const safeFilename = cleanBasename.endsWith('.csv') ? cleanBasename : `${cleanBasename}.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
  } catch (err) {
    clientSafeLogger.error('[CSV Export Failed]:', mapToSafeErrorMessage(err));
    return false;
  }
}
