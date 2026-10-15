/**
 * TIP CRM — Data Cleaning Engine
 * Normalizes categorical statuses, standardizes casing, sanitizes numbers,
 * removes duplicate rows, and records explicit transformation logs.
 */

export interface CleaningAuditEntry {
  type: 'status_normalized' | 'email_cleaned' | 'date_formatted' | 'duplicate_removed' | 'number_sanitized';
  original: string;
  cleaned: string;
  count: number;
}

export interface CleaningResult {
  cleanedRows: Record<string, string>[];
  removedDuplicatesCount: number;
  transformations: CleaningAuditEntry[];
}

/**
 * Standardizes attendance variations to canonical TIP CRM status
 */
export function normalizeAttendanceStatus(rawVal: string): { status: string; changed: boolean } {
  if (!rawVal) return { status: 'Registered', changed: false };
  const lower = rawVal.toLowerCase().trim();

  if (['attended', 'present', 'yes', 'showed up', 'here', 'completed', 'checked in', 'checked-in'].includes(lower)) {
    return { status: 'Attended', changed: rawVal !== 'Attended' };
  }
  if (['did not attend', 'no-show', 'absent', 'no', 'missed', 'dnq'].includes(lower)) {
    return { status: 'Did not attend', changed: rawVal !== 'Did not attend' };
  }
  if (['registered', 'rsvp', 'enrolled', 'confirmed', 'signup'].includes(lower)) {
    return { status: 'Registered', changed: rawVal !== 'Registered' };
  }
  if (['waitlist', 'waitlisted', 'queue'].includes(lower)) {
    return { status: 'Waitlisted', changed: rawVal !== 'Waitlisted' };
  }
  if (['withdrawn', 'cancelled', 'canceled', 'dropped'].includes(lower)) {
    return { status: 'Withdrawn', changed: rawVal !== 'Withdrawn' };
  }

  return { status: rawVal.trim(), changed: false };
}

/**
 * Cleans and normalizes numeric/currency values (accounting negatives, commas, currency symbols)
 */
export function cleanNumericCell(val: string): string {
  if (!val) return '';
  let numVal = val.trim();
  // Accounting negative format: (5,000) -> -5000
  const isNegativeAccounting = /^\s*\((.+)\)\s*$/.test(numVal);
  if (isNegativeAccounting) {
    numVal = '-' + numVal.replace(/^\s*\((.+)\)\s*$/, '$1');
  }
  const numStr = numVal.replace(/[^0-9.-]/g, '');
  return numStr;
}

/**
 * Clean and standardize raw rows based on column mappings
 */
export function cleanDataset(
  headers: string[],
  rows: Record<string, string>[],
  columnMappingMap: Record<string, string>, // csvCol -> crmField
  deduplicate: boolean = true
): CleaningResult {
  const transformationsMap = new Map<string, CleaningAuditEntry>();
  const seenSignatures = new Set<string>();
  const cleanedRows: Record<string, string>[] = [];
  let removedDuplicatesCount = 0;

  const recordTransform = (type: CleaningAuditEntry['type'], original: string, cleaned: string) => {
    if (original === cleaned) return;
    const key = `${type}:${original}->${cleaned}`;
    const existing = transformationsMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      transformationsMap.set(key, { type, original, cleaned, count: 1 });
    }
  };

  rows.forEach(row => {
    // Check duplicates if enabled
    if (deduplicate) {
      const sig = headers.map(h => row[h] || '').join('|||');
      if (seenSignatures.has(sig)) {
        removedDuplicatesCount++;
        recordTransform('duplicate_removed', 'duplicate_row', 'omitted');
        return;
      }
      seenSignatures.add(sig);
    }

    const cleanRow: Record<string, string> = {};

    headers.forEach(header => {
      let val = (row[header] || '').trim();
      const mappedField = columnMappingMap[header] || '';

      // Clean attendance status
      if (mappedField.toLowerCase().includes('attendance')) {
        const { status, changed } = normalizeAttendanceStatus(val);
        if (changed) {
          recordTransform('status_normalized', val, status);
        }
        val = status;
      }

      // Clean email
      else if (mappedField.toLowerCase().includes('email')) {
        const cleanedEmail = val.toLowerCase().trim();
        if (val !== cleanedEmail) {
          recordTransform('email_cleaned', val, cleanedEmail);
        }
        val = cleanedEmail;
      }

      // Clean funding/currency numbers
      else if (mappedField.toLowerCase().includes('funding') || mappedField.toLowerCase().includes('amount')) {
        const numStr = cleanNumericCell(val);
        if (val !== numStr && numStr !== '') {
          recordTransform('number_sanitized', val, numStr);
          val = numStr;
        }
      }

      // Clean dates to ISO format YYYY-MM-DD if possible
      else if (mappedField.toLowerCase().includes('date')) {
        const parsed = Date.parse(val);
        if (!isNaN(parsed) && (val.includes('/') || val.includes('.'))) {
          const d = new Date(parsed);
          const isoDate = d.toISOString().split('T')[0];
          recordTransform('date_formatted', val, isoDate);
          val = isoDate;
        }
      }

      cleanRow[header] = val;
    });

    cleanedRows.push(cleanRow);
  });

  return {
    cleanedRows,
    removedDuplicatesCount,
    transformations: Array.from(transformationsMap.values())
  };
}
