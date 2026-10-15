/**
 * TIP CRM — Data Profiler & Column Intelligence Engine
 * Inspects raw tabular / CSV data, infers column schemas, calculates quality metrics,
 * and matches column headers to canonical CRM entities.
 */

import { ColumnProfile, DataQualityReport, ColumnMapping } from '../types';

/**
 * Delimiter-agnostic CSV/TSV parser supporting quotes and escaped delimiters
 */
export function parseCsvText(rawText: string): { headers: string[]; rows: Record<string, string>[] } {
  if (!rawText || !rawText.trim()) {
    return { headers: [], rows: [] };
  }

  // Strip leading UTF-8 Byte Order Mark (BOM) from Excel CSV exports
  const cleanRawText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanRawText) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter: comma, tab, semicolon
  const firstLine = cleanRawText.split('\n')[0] || '';
  let delimiter = ',';
  if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = '\t';
  } else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  }

  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanRawText.length; i++) {
    const char = cleanRawText[i];
    const nextChar = cleanRawText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let cur = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === delimiter && !inQuote) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h, idx) => h.replace(/^["']|["']$/g, '').trim() || `column_${idx + 1}`);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    let hasData = false;

    headers.forEach((header, idx) => {
      const val = rowValues[idx] !== undefined ? rowValues[idx].replace(/^["']|["']$/g, '').trim() : '';
      rowObj[header] = val;
      if (val) hasData = true;
    });

    if (hasData) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

// Canonical CRM Field Definitions for Column Intelligence (Section 8)
export const CANONICAL_CRM_FIELDS = [
  { 
    id: 'person_name', 
    label: 'Person Name', 
    patterns: ['name', 'full_name', 'fullname', 'participant_name', 'participantname', 'attendee', 'individual', 'client', 'contact_name'] 
  },
  { 
    id: 'email', 
    label: 'Email Address', 
    patterns: ['email', 'email_address', 'emailaddress', 'mail', 'contact_email'] 
  },
  { 
    id: 'phone', 
    label: 'Phone Number', 
    patterns: ['phone', 'phone_number', 'phonenumber', 'tel', 'telephone', 'mobile', 'cell'] 
  },
  { 
    id: 'organization', 
    label: 'Partner Organization', 
    patterns: ['organization', 'partner_organization', 'org', 'company', 'agency', 'institution', 'partner'] 
  },
  { 
    id: 'program', 
    label: 'Program Name', 
    patterns: ['program', 'program_name', 'programname', 'funded_program', 'cohort', 'initiative', 'track'] 
  },
  { 
    id: 'event', 
    label: 'Event / Session', 
    patterns: ['event', 'event_name', 'eventname', 'workshop', 'session', 'session_name', 'activity', 'meeting'] 
  },
  { 
    id: 'event_date', 
    label: 'Event Date', 
    patterns: ['contribution_date', 'contributiondate', 'grant_date', 'grantdate', 'funding_date', 'fundingdate', 'event_date', 'eventdate', 'session_date', 'date_of_event', 'date', 'timestamp'] 
  },
  { 
    id: 'attendance_status', 
    label: 'Attendance Status', 
    patterns: ['attendance_status', 'attendancestatus', 'attendance', 'attended', 'presence', 'check_in', 'checkin', 'rsvp_status'] 
  },
  { 
    id: 'record_status', 
    label: 'Status / Stage', 
    patterns: ['funding_status', 'fundingstatus', 'grant_status', 'grantstatus', 'deal_status', 'record_status', 'status', 'stage', 'state', 'phase'] 
  },
  { 
    id: 'role', 
    label: 'Role / Relationship', 
    patterns: ['role', 'relationship', 'participant_role', 'category', 'funder_type', 'fundertype', 'funding_type', 'fundingtype', 'type'] 
  },
  { 
    id: 'funding_amount', 
    label: 'Funding Amount ($ CAD)', 
    patterns: ['fundingcad', 'funding_cad', 'funding_amount', 'fundingamount', 'amount_cad', 'amountcad', 'grant_amount', 'grantamount', 'contribution_amount', 'contributionamount', 'contributioncad', 'contribution_cad', 'amount', 'funding', 'donation', 'contribution', 'value'] 
  },
  { 
    id: 'donor', 
    label: 'Donor / Funder', 
    patterns: ['funder_name', 'fundername', 'donor_name', 'donorname', 'funding_source', 'fundingsource', 'funder', 'donor', 'sponsor', 'grantor', 'source'] 
  },
  { 
    id: 'location', 
    label: 'Location / Venue', 
    patterns: ['location', 'venue', 'city', 'province', 'room', 'address'] 
  },
  { 
    id: 'notes', 
    label: 'Notes & Follow-ups', 
    patterns: ['notes', 'comments', 'details', 'feedback', 'summary', 'description'] 
  }
];

/**
 * Infers the canonical CRM field for a given CSV column header with disambiguation
 */
export function inferColumnMapping(header: string): { fieldId: string; confidence: number } {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').trim();
  const rawNoUnderscores = header.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // 1. Exact match check first across all fields
  for (const field of CANONICAL_CRM_FIELDS) {
    for (const pattern of field.patterns) {
      const patNoUnder = pattern.replace(/_/g, '');
      if (normalized === pattern || rawNoUnderscores === patNoUnder) {
        return { fieldId: field.id, confidence: 0.98 };
      }
    }
  }

  // 2. Disambiguation rules for compound column names:
  // - If column contains "status", prioritize Status fields over amount/date
  if (normalized.includes('status')) {
    if (normalized.includes('attend')) {
      return { fieldId: 'attendance_status', confidence: 0.92 };
    }
    return { fieldId: 'record_status', confidence: 0.92 };
  }

  // - If column contains "date", prioritize Date field over amount/status
  if (normalized.includes('date') || normalized.includes('time')) {
    return { fieldId: 'event_date', confidence: 0.92 };
  }

  // - If column contains "funder" or "donor" without "amount"/"cad", prioritize donor/funder
  if ((normalized.includes('funder') || normalized.includes('donor')) && !normalized.includes('amount') && !normalized.includes('cad')) {
    if (normalized.includes('type')) {
      return { fieldId: 'role', confidence: 0.90 };
    }
    return { fieldId: 'donor', confidence: 0.95 };
  }

  // - If column contains "amount", "cad", "fundingcad", or financial amount patterns:
  if (normalized.includes('amount') || normalized.includes('cad') || normalized.includes('fundingcad') || normalized.includes('contributioncad')) {
    return { fieldId: 'funding_amount', confidence: 0.95 };
  }

  // 3. Fallback: Prioritized partial match (longer patterns first to avoid greedy substring collisions)
  const allPatternsWithField: Array<{ fieldId: string; pattern: string; patLen: number }> = [];
  for (const field of CANONICAL_CRM_FIELDS) {
    for (const pattern of field.patterns) {
      allPatternsWithField.push({ fieldId: field.id, pattern, patLen: pattern.length });
    }
  }
  allPatternsWithField.sort((a, b) => b.patLen - a.patLen);

  for (const item of allPatternsWithField) {
    const patNoUnder = item.pattern.replace(/_/g, '');
    if (
      normalized.includes(item.pattern) || 
      (rawNoUnderscores.length >= 4 && rawNoUnderscores.includes(patNoUnder)) ||
      (item.pattern.length >= 4 && item.pattern.includes(normalized))
    ) {
      return { fieldId: item.fieldId, confidence: 0.85 };
    }
  }

  return { fieldId: 'unmapped', confidence: 0.2 };
}


/**
 * Automatically inspects dataset and calculates comprehensive data profiles & quality reports
 */
export function profileDataset(headers: string[], rows: Record<string, string>[]): {
  columnProfiles: ColumnProfile[];
  mappings: ColumnMapping[];
  qualityReport: DataQualityReport;
} {
  const totalRows = rows.length;
  const columnProfiles: ColumnProfile[] = [];
  const mappings: ColumnMapping[] = [];

  let duplicateRows = 0;
  const rowSignatures = new Set<string>();
  let duplicateIds = 0;
  const seenIds = new Set<string>();
  let missingEmails = 0;
  let invalidDates = 0;
  const warnings: string[] = [];

  // Check row-level duplicates
  rows.forEach(r => {
    const signature = headers.map(h => r[h] || '').join('|||');
    if (rowSignatures.has(signature)) {
      duplicateRows++;
    } else {
      rowSignatures.add(signature);
    }
  });

  // Profile each column
  headers.forEach(h => {
    let nullCount = 0;
    const valuesSet = new Set<string>();
    const samples: string[] = [];
    let numericCount = 0;
    let dateCount = 0;
    let emailCount = 0;
    let numbersList: number[] = [];

    rows.forEach(row => {
      const val = row[h];
      if (!val || val.trim() === '' || val.toLowerCase() === 'null' || val.toLowerCase() === 'n/a' || val === '-') {
        nullCount++;
        return;
      }

      valuesSet.add(val);
      if (samples.length < 5) samples.push(val);

      // Check numeric
      const cleanNum = val.replace(/[$, CADcad]/g, '').trim();
      const num = Number(cleanNum);
      if (!isNaN(num) && cleanNum !== '') {
        numericCount++;
        numbersList.push(num);
      }

      // Check date
      if (!isNaN(Date.parse(val)) && (val.includes('-') || val.includes('/') || val.includes(','))) {
        dateCount++;
      }

      // Check email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        emailCount++;
      }
    });

    const validCount = totalRows - nullCount;
    let inferredType: ColumnProfile['inferredType'] = 'text';

    if (emailCount > validCount * 0.7) {
      inferredType = 'email';
    } else if (dateCount > validCount * 0.7) {
      inferredType = 'date';
    } else if (numericCount > validCount * 0.8) {
      const isCurrency = samples.some(s => s.includes('$') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('fund'));
      inferredType = isCurrency ? 'currency' : 'number';
    } else if (valuesSet.size > 0 && valuesSet.size <= 25 && validCount > 10) {
      inferredType = 'categorical';
    }

    const { fieldId, confidence } = inferColumnMapping(h);
    const matchedCanonical = CANONICAL_CRM_FIELDS.find(f => f.id === fieldId);

    // Track missing emails for email-mapped columns
    if (fieldId === 'email') {
      missingEmails += nullCount;
    }
    // Track invalid dates
    if (fieldId === 'event_date' && dateCount < validCount) {
      invalidDates += (validCount - dateCount);
    }

    const profile: ColumnProfile = {
      name: h,
      inferredType,
      nullCount,
      nullPercentage: totalRows > 0 ? Math.round((nullCount / totalRows) * 100) : 0,
      uniqueCount: valuesSet.size,
      sampleValues: samples,
      suggestedMapping: matchedCanonical?.label
    };

    if (numbersList.length > 0) {
      numbersList.sort((a, b) => a - b);
      profile.min = numbersList[0];
      profile.max = numbersList[numbersList.length - 1];
      profile.mean = Math.round((numbersList.reduce((acc, v) => acc + v, 0) / numbersList.length) * 100) / 100;
    }

    columnProfiles.push(profile);
    mappings.push({
      csvColumn: h,
      crmField: matchedCanonical?.label || 'Custom Attribute',
      confidence,
      confirmed: confidence > 0.8
    });
  });

  // Calculate Data Quality Summary (Section 7 & 11)
  const totalCells = totalRows * headers.length;
  const totalNulls = columnProfiles.reduce((acc, c) => acc + c.nullCount, 0);
  const completeness = totalCells > 0 ? (totalCells - totalNulls) / totalCells : 1;
  const validPercentage = Math.round(completeness * 100 * 10) / 10;
  const validRows = Math.max(0, totalRows - duplicateRows);

  if (duplicateRows > 0) {
    warnings.push(`${duplicateRows} duplicate record${duplicateRows > 1 ? 's' : ''} detected in the dataset.`);
  }
  if (missingEmails > 0) {
    warnings.push(`${missingEmails} missing or invalid email address${missingEmails > 1 ? 'es' : ''}.`);
  }
  if (invalidDates > 0) {
    warnings.push(`${invalidDates} record${invalidDates > 1 ? 's' : ''} have unparseable event dates.`);
  }

  let qualityRating: DataQualityReport['qualityRating'] = 'Good';
  if (validPercentage >= 95 && duplicateRows === 0 && warnings.length === 0) {
    qualityRating = 'Excellent';
  } else if (validPercentage >= 85) {
    qualityRating = 'Good';
  } else if (validPercentage >= 70) {
    qualityRating = 'Fair';
  } else {
    qualityRating = 'Poor';
  }

  const qualityReport: DataQualityReport = {
    totalRows,
    validRows,
    validPercentage,
    duplicateRows,
    duplicateIds,
    missingEmails,
    invalidDates,
    warningsCount: warnings.length,
    warnings,
    qualityRating
  };

  return { columnProfiles, mappings, qualityReport };
}
