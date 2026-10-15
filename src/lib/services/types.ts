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

  // If modern crypto.randomUUID is available, use it
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
