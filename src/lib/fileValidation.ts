/**
 * TIP CRM — Secure File Validation & Storage Defense Utilities
 * File: src/lib/fileValidation.ts
 *
 * Enforces:
 * 1. Strict MIME type and extension validation against safe whitelist.
 * 2. Magic byte / signature verification for uploaded binaries (PDF, PNG, JPEG, ZIP/DOCX/XLSX).
 * 3. Filename sanitization and path traversal prevention (strips ../, null bytes, control chars).
 * 4. Safe external link validation (strictly permits http/https, blocks javascript:, data:, file:).
 * 5. Bounded size enforcement (10MB for documents, 25MB for backups/CSV).
 */

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_BACKUP_SIZE_BYTES = 25 * 1024 * 1024;   // 25 MB

export const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'xlsx',
  'csv',
  'txt',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'json' // strictly for backups
]);

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/json'
]);

export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'js', 'vbs', 'html', 'htm', 'svg',
  'jar', 'py', 'dll', 'scr', 'msi', 'apk', 'com', 'pif', 'hta', 'cpl', 'iso'
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  detectedMimeType?: string;
  sizeBytes?: number;
}

/**
 * Sanitizes a user-supplied filename to prevent path traversal and shell injection
 */
export function sanitizeFilename(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return `file_${Date.now()}`;
  }

  // 1. Strip null bytes (neutralizing poison extensions), control chars, and path delimiters
  let clean = rawName
    .split('\0')[0]
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .pop() || ''; // keep only basename

  // 2. Remove directory traversal sequences
  clean = clean.replace(/\.{2,}/g, '.');

  // 3. Remove characters that are unsafe across filesystems
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 4. Ensure filename does not start with a dot or dash
  clean = clean.replace(/^[.-]+/, '');

  if (!clean || clean === '.') {
    clean = `upload_${Date.now()}`;
  }

  // 5. Truncate long filenames while preserving extension
  if (clean.length > 100) {
    const parts = clean.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      clean = `${parts.join('.').slice(0, 90)}.${ext}`;
    } else {
      clean = clean.slice(0, 100);
    }
  }

  return clean;
}

/**
 * Verifies magic bytes / file signature if binary buffer is available
 */
export function verifyMagicBytes(bytes: Uint8Array): { valid: boolean; detectedType?: string; error?: string } {
  if (!bytes || bytes.length < 4) {
    return { valid: false, error: 'File is empty or too small to verify signature.' };
  }

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { valid: true, detectedType: 'application/pdf' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return { valid: true, detectedType: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, detectedType: 'image/jpeg' };
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { valid: true, detectedType: 'image/webp' };
  }

  // ZIP / DOCX / XLSX: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { valid: true, detectedType: 'application/zip' };
  }

  // Check for executable signatures (ELF: 7F 45 4C 46, DOS/PE: 4D 5A)
  if ((bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) ||
      (bytes[0] === 0x4D && bytes[1] === 0x5A)) {
    return { valid: false, error: 'Executable binary file types are strictly forbidden.' };
  }

  // Check for text / CSV / JSON (contains no binary null bytes in initial chunk)
  let isText = true;
  const inspectLen = Math.min(bytes.length, 512);
  for (let i = 0; i < inspectLen; i++) {
    if (bytes[i] === 0x00) {
      isText = false;
      break;
    }
  }

  if (isText) {
    return { valid: true, detectedType: 'text/plain' };
  }

  return { valid: false, error: 'Unrecognized or unsupported binary file signature.' };
}

/**
 * Validates uploaded file parameters against size, extension, MIME, and dangerous signatures
 */
export function validateUploadFile(params: {
  filename: string;
  sizeBytes: number;
  mimeType?: string;
  buffer?: Uint8Array;
  isBackup?: boolean;
}): FileValidationResult {
  const { filename, sizeBytes, mimeType, buffer, isBackup } = params;

  // 1. Check file size
  if (!sizeBytes || sizeBytes <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  const maxSize = isBackup ? MAX_BACKUP_SIZE_BYTES : MAX_DOCUMENT_SIZE_BYTES;
  if (sizeBytes > maxSize) {
    return {
      valid: false,
      error: `File size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit (${(maxSize / (1024 * 1024))} MB).`
    };
  }

  // 2. Validate filename and extension
  const safeName = sanitizeFilename(filename);
  const ext = safeName.split('.').pop()?.toLowerCase() || '';

  if (!ext) {
    return { valid: false, error: 'File must have a valid extension.' };
  }

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Executable or active script extension (.${ext}) is strictly prohibited.` };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension (.${ext}) is not permitted. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}` };
  }

  if (!isBackup && ext === 'json') {
    return { valid: false, error: 'JSON files are only permitted for database backups.' };
  }

  // 3. Validate declared MIME type
  if (mimeType && mimeType !== 'application/octet-stream') {
    const cleanMime = mimeType.toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      return { valid: false, error: `Declared MIME type (${cleanMime}) is not permitted.` };
    }
  }

  // 4. Verify magic bytes if buffer is provided
  if (buffer && buffer.length > 0) {
    const sigResult = verifyMagicBytes(buffer);
    if (!sigResult.valid) {
      return { valid: false, error: sigResult.error || 'Binary signature validation failed.' };
    }
  }

  return {
    valid: true,
    sanitizedFilename: safeName,
    sizeBytes
  };
}

/**
 * Validates external document and cloud links
 * Strictly permits only http: and https: protocols, preventing javascript:, data:, file:
 */
export function validateExternalUrl(rawUrl: string): {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL cannot be empty.' };
  }

  const trimmed = rawUrl.trim();

  // Explicit check for dangerous protocol prefixes before URL parsing
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return { isValid: false, error: 'Dangerous URL scheme detected. Only http:// and https:// links are permitted.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: `Invalid URL protocol: "${parsed.protocol}". Only HTTP and HTTPS links are allowed.` };
    }

    // Disallow local loopback addresses in production documents
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0') {
      return { isValid: false, error: 'Localhost links cannot be used as external organization documents.' };
    }

    return {
      isValid: true,
      sanitizedUrl: parsed.toString()
    };
  } catch {
    return { isValid: false, error: 'Malformed or invalid URL format.' };
  }
}

/**
 * Validates database backup JSON payload structure and guards against prototype pollution.
 */
export function validateBackupStructure(data: any): {
  valid: boolean;
  error?: string;
  counts?: Record<string, number>;
  sanitizedData?: any;
} {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Backup data must be a valid JSON object.' };
  }

  // Deep check for prototype pollution keys (__proto__, constructor, prototype)
  function checkPrototypePollution(obj: any, depth = 0): boolean {
    if (depth > 20) return false;
    if (!obj || typeof obj !== 'object') return false;

    // Check prototype tampering
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
      return true;
    }

    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkPrototypePollution(obj[key], depth + 1)) {
          return true;
        }
      }
    }
    return false;
  }

  if (checkPrototypePollution(data)) {
    return { valid: false, error: 'Prototype pollution attempt detected in backup structure.' };
  }

  const validEntityKeys = [
    'people',
    'organizations',
    'programs',
    'events',
    'participants',
    'tasks',
    'funding',
    'interactions',
    'documents'
  ];

  const counts: Record<string, number> = {};

  for (const entityKey of validEntityKeys) {
    if (entityKey in data) {
      if (!Array.isArray(data[entityKey])) {
        return { valid: false, error: `Invalid format: "${entityKey}" must be an array of records.` };
      }
      counts[entityKey] = data[entityKey].length;
    }
  }

  if (Object.keys(counts).length === 0 && !data.organization && !data.exportedAt) {
    return { valid: false, error: 'Invalid backup: No recognized CRM entities found.' };
  }

  return {
    valid: true,
    counts,
    sanitizedData: data
  };
}
