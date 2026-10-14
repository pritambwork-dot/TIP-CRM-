/**
 * TIP CRM — Client-Side Safe Error Handling & Sanitization Utilities
 * File: src/lib/safeErrors.ts
 *
 * Ensures:
 * 1. Zero sensitive credentials, tokens, or internal paths are rendered in UI or client logs.
 * 2. Standardized error reporting with correlation IDs.
 * 3. Graceful degradation and user-friendly error messages.
 */

export interface SafeErrorEnvelope {
  error: string;
  code?: string;
  correlationId?: string;
  details?: Record<string, any>;
}

/**
 * Redacts any sensitive tokens, API keys, passwords, or credentials from strings
 */
export function sanitizeSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/AIza[0-9A-Za-z-_]{30,40}/g, '[REDACTED_API_KEY]')
    .replace(/(?:key|apiKey|api_key|api-key)\s*[:=]\s*["']?([^\s&"']+)["']?/gi, 'key=[REDACTED]')
    .replace(/(?:bearer\s+)([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)/gi, 'bearer [REDACTED_TOKEN]')
    .replace(/tip_sess_[A-Za-z0-9_.-]+/gi, '[REDACTED_SESSION_TOKEN]')
    .replace(/tip_token_[A-Za-z0-9_.-]+/gi, '[REDACTED_SESSION_TOKEN]')
    .replace(/(?:tip_session|session_id|sessionId|sessionToken)\s*[:=]\s*["']?([^\s&;"']+)["']?/gi, 'tip_session=[REDACTED]')
    .replace(/(?:password|tempPassword|secret)\s*[:=]\s*["']?([^\s&"']+)["']?/gi, 'password=[REDACTED]')
    .replace(/supabase[a-z0-9._-]*key/gi, '[REDACTED_KEY]');
}

/**
 * Generates a unique tracking correlation ID for debugging
 */
export function generateCorrelationId(prefix = 'err'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Maps database or network error codes into safe human-readable messages
 */
export function mapToSafeErrorMessage(err: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallbackMessage;

  const rawMessage = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as any).message)
    : String(err);

  const sanitized = sanitizeSecrets(rawMessage);

  // Postgres / PostgREST specific errors
  if (/duplicate key|unique constraint/i.test(sanitized)) {
    return 'A record with this identifier or email already exists.';
  }
  if (/foreign key|violates foreign key constraint/i.test(sanitized)) {
    return 'This operation cannot be completed because related records depend on it.';
  }
  if (/check constraint/i.test(sanitized)) {
    return 'The provided information did not meet validation requirements.';
  }
  if (/permission denied|not authorized|row-level security/i.test(sanitized)) {
    return 'You do not have sufficient permissions to perform this action.';
  }
  if (/network|failed to fetch|timeout|econnrefused/i.test(sanitized)) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  if (/jwt|token expired|invalid refresh token/i.test(sanitized)) {
    return 'Your session has expired. Please log in again to continue.';
  }

  // If the sanitized message contains stack traces or internal filenames, suppress it
  if (/\b(?:at\s+[a-z0-9_./\\]+|\.tsx?:\d+|\.jsx?:\d+)/i.test(sanitized)) {
    return fallbackMessage;
  }

  return sanitized.length > 200 ? fallbackMessage : sanitized;
}

/**
 * Safe client logger that redacts secrets before emitting
 */
export const clientSafeLogger = {
  info: (msg: string, ...args: any[]) => {
    console.log(sanitizeSecrets(msg), ...args.map(a => typeof a === 'string' ? sanitizeSecrets(a) : a));
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(sanitizeSecrets(msg), ...args.map(a => typeof a === 'string' ? sanitizeSecrets(a) : a));
  },
  error: (msg: string, err?: any, ...args: any[]) => {
    const sanitizedMsg = sanitizeSecrets(msg);
    const sanitizedErrMsg = err?.message ? sanitizeSecrets(err.message) : (typeof err === 'string' ? sanitizeSecrets(err) : '');
    console.error(sanitizedMsg, sanitizedErrMsg || '', ...args.map(a => typeof a === 'string' ? sanitizeSecrets(a) : a));
  }
};
