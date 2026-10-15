/**
 * TIP CRM - Database Service Common Types and Helpers
 *
 * Provides standard ServiceResult, ServiceError, and bidirectional
 * mapping utilities between PostgreSQL schema (snake_case) and
 * frontend TypeScript data models (camelCase).
 */

export interface ServiceError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

export interface ServiceResult<T> {
  data: T | null;
  error: ServiceError | null;
}

export function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

export function err<T = any>(message: string, code = 'SERVICE_ERROR', status = 500, details?: any): ServiceResult<T> {
  return {
    data: null,
    error: {
      code,
      message,
      status,
      details
    }
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIMPLE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the string is a valid UUID format
 */
export function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return SIMPLE_UUID_REGEX.test(val.trim());
}

/**
 * Converts any ID to a valid RFC4122 v4 UUID.
 * If the input is already a valid UUID, it is preserved.
 * If it is an application mock ID (e.g. 'p-1', 'org-1'), it deterministically
 * hashes or replaces it with a valid UUID so PostgreSQL won't reject it.
 */
export function toValidUuid(id?: string | null): string {
  if (id && isUuid(id)) {
    return id.trim().toLowerCase();
  }

  // Deterministically hash non-empty non-UUID strings into a consistent RFC4122 v4 UUID
  if (id && typeof id === 'string' && id.trim().length > 0) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
    const str = id.trim();
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ ch, 3812015801);
      h4 = Math.imul(h4 ^ ch, 2246822507);
    }
    const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
    const full = hex(h1) + hex(h2) + hex(h3) + hex(h4);
    // Format as 8-4-4-4-12 RFC4122 v4: 8-4-4(version 4)-4(variant a)-12
    return `${full.substring(0, 8)}-${full.substring(8, 12)}-4${full.substring(13, 16)}-a${full.substring(17, 20)}-${full.substring(20, 32)}`;
  }

  // If modern crypto.randomUUID is available, use it for fresh ID generation
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback RFC4122 v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normalizes date to ISO string (YYYY-MM-DD)
 */
export function toIsoDate(val?: string | Date | null): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    return val;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalizes timestamp to ISO 8601 string with timezone
 */
export function toIsoTimestamp(val?: string | Date | number | null): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  if (typeof val === 'string') {
    try {
      return new Date(val).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}
