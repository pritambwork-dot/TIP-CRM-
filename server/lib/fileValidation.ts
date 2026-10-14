/**
 * TIP CRM — Server-Side File Validation & Signed Storage Management
 * File: server/lib/fileValidation.ts
 *
 * Implements:
 * 1. Server-side validation of file sizes, extensions, MIME types, and magic bytes.
 * 2. Path traversal scrubbing and safe randomized storage object keys.
 * 3. Expiring signed file access tokens (default 15 minutes, max 1 hour).
 * 4. External URL protocol validation (HTTP/HTTPS only).
 */

import crypto from 'crypto';
import { sanitizeSecrets } from './ai/gemini.ts';

import {
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_BACKUP_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS
} from '../../src/lib/fileValidation.ts';

export {
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_BACKUP_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS
};


export const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;       // 15 minutes
export const MAX_SIGNED_URL_TTL_SECONDS = 3600;           // 1 hour


// Secret for HMAC-signing file access tokens (generated once per server runtime or loaded from env)
const STORAGE_SIGNING_SECRET = process.env.STORAGE_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');

export function sanitizeFilename(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return `file_${Date.now()}`;
  }

  // Neutralize null byte poisoning by discarding any content after null byte
  let clean = rawName
    .split('\0')[0]
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .pop() || '';

  clean = clean.replace(/\.{2,}/g, '.');
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
  clean = clean.replace(/^[.-]+/, '');

  if (!clean || clean === '.') {
    clean = `upload_${Date.now()}`;
  }

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

export function generateStorageKey(params: {
  bucket: string;
  organizationId?: string;
  filename: string;
}): string {
  const cleanBucket = params.bucket.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanOrg = (params.organizationId || 'org-tip').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFilename = sanitizeFilename(params.filename);
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now().toString(36);

  return `${cleanBucket}/${cleanOrg}/${timestamp}-${randomSuffix}-${safeFilename}`;
}

export function verifyMagicBytes(bytes: Uint8Array): { valid: boolean; detectedType?: string; error?: string } {
  if (!bytes || bytes.length < 4) {
    return { valid: false, error: 'File is empty or too small to verify signature.' };
  }

  // PDF: %PDF-
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { valid: true, detectedType: 'application/pdf' };
  }

  // PNG
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return { valid: true, detectedType: 'image/png' };
  }

  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, detectedType: 'image/jpeg' };
  }

  // WEBP
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { valid: true, detectedType: 'image/webp' };
  }

  // ZIP / DOCX / XLSX: PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { valid: true, detectedType: 'application/zip' };
  }

  // Dangerous binary execution headers
  if ((bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) ||
      (bytes[0] === 0x4D && bytes[1] === 0x5A)) {
    return { valid: false, error: 'Executable binary files are strictly prohibited.' };
  }

  // Text / CSV
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

export function validateUploadFile(params: {
  filename: string;
  sizeBytes: number;
  mimeType?: string;
  buffer?: Uint8Array;
  isBackup?: boolean;
}): { valid: boolean; error?: string; sanitizedFilename?: string; sizeBytes?: number } {
  const { filename, sizeBytes, mimeType, buffer, isBackup } = params;

  if (!sizeBytes || sizeBytes <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  const maxSize = isBackup ? MAX_BACKUP_SIZE_BYTES : MAX_DOCUMENT_SIZE_BYTES;
  if (sizeBytes > maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit (${(maxSize / (1024 * 1024))} MB).`
    };
  }

  const safeName = sanitizeFilename(filename);
  const ext = safeName.split('.').pop()?.toLowerCase() || '';

  if (!ext) {
    return { valid: false, error: 'File must have a valid extension.' };
  }

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Executable or script extension (.${ext}) is strictly prohibited.` };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension (.${ext}) is not permitted.` };
  }

  if (!isBackup && ext === 'json') {
    return { valid: false, error: 'JSON files are only permitted for database backups.' };
  }

  if (mimeType && mimeType !== 'application/octet-stream') {
    const cleanMime = mimeType.toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      return { valid: false, error: `MIME type (${cleanMime}) is not permitted.` };
    }
  }

  if (buffer && buffer.length > 0) {
    const sig = verifyMagicBytes(buffer);
    if (!sig.valid) {
      return { valid: false, error: sig.error || 'Binary signature validation failed.' };
    }
  }

  return { valid: true, sanitizedFilename: safeName, sizeBytes };
}

export function validateExternalUrl(rawUrl: string): {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL cannot be empty.' };
  }

  const trimmed = rawUrl.trim();
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

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0') {
      return { isValid: false, error: 'Localhost links cannot be used as external organization documents.' };
    }

    return { isValid: true, sanitizedUrl: parsed.toString() };
  } catch {
    return { isValid: false, error: 'Malformed or invalid URL format.' };
  }
}

/**
 * Creates a cryptographically signed file access token with an expiration timestamp
 */
export function createSignedFileToken(params: {
  storageKey: string;
  userId: string;
  ttlSeconds?: number;
  expiresAt?: number;
}): { token: string; expiresAt: number; signedUrl: string } {
  const expiresAt = params.expiresAt !== undefined
    ? params.expiresAt
    : Math.floor(Date.now() / 1000) + Math.min(
        MAX_SIGNED_URL_TTL_SECONDS,
        Math.max(60, Number(params.ttlSeconds) || DEFAULT_SIGNED_URL_TTL_SECONDS)
      );

  const payload = `${params.storageKey}|${params.userId}|${expiresAt}`;
  const hmac = crypto.createHmac('sha256', STORAGE_SIGNING_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  const signedUrl = `/api/storage/download?token=${token}`;

  return { token, expiresAt, signedUrl };
}

/**
 * Validates a signed file access token and verifies expiration
 */
export function verifySignedFileToken(token: string): {
  valid: boolean;
  storageKey?: string;
  userId?: string;
  error?: string;
} {
  try {
    if (!token) return { valid: false, error: 'Missing access token.' };

    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const { payload, signature } = JSON.parse(raw);

    const hmac = crypto.createHmac('sha256', STORAGE_SIGNING_SECRET);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return { valid: false, error: 'Invalid file signature or tampered token.' };
    }

    const [storageKey, userId, expiresAtStr] = payload.split('|');
    const expiresAt = Number(expiresAtStr);

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      return { valid: false, error: 'Signed URL has expired. Please request a new download link.' };
    }

    return { valid: true, storageKey, userId };
  } catch {
    return { valid: false, error: 'Invalid or corrupted file access token.' };
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
