/**
 * Utility for secure CSV export with formula injection sanitization.
 * Protects against CSV injection attacks (OWASP / RFC 4180).
 */

export function sanitizeCsvCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return '""';
  let str = String(cell).trim();
  // Formula injection check: if cell starts with =, +, -, @, \t, or \r, prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const csvContent = rows
    .map(row => row.map(sanitizeCsvCell).join(','))
    .join('\r\n');

  // \uFEFF UTF-8 BOM ensures Excel accurately renders special/accented characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
