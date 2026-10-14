/**
 * TIP CRM — Server-Side Safe Error Handling & Response Envelope Utilities
 * File: server/lib/safeErrors.ts
 *
 * STRICT SECURITY INVARIANTS:
 * 1. Never leaks raw stack traces, DB connection strings, file paths, or API keys in HTTP responses.
 * 2. Standardized error structure: { error: string, code: string, correlationId: string, details?: any }.
 * 3. Consistent HTTP status codes (400, 401, 403, 404, 429, 500, 503).
 * 4. Logs server errors via safeLogger with correlation IDs for operational tracing.
 */

import type { ServerResponse } from 'http';
import { sanitizeSecrets, safeLogger } from './ai/gemini.ts';

export interface ApiErrorEnvelope {
  error: string;
  code: string;
  correlationId: string;
  details?: Record<string, any>;
  fallbackDeterministic?: boolean;
}

export function generateServerCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `tip-srv-${ts}-${rand}`;
}

export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;

export function sendSafeError(
  res: ServerResponse,
  statusCode: number,
  clientMessage: string,
  errorCode: string,
  internalError?: any,
  details?: Record<string, any>
): void {
  const correlationId = generateServerCorrelationId();

  // Redact client message in case an un-sanitized string was passed
  const safeClientMessage = sanitizeSecrets(clientMessage);

  if (internalError) {
    const rawMsg = internalError?.message || String(internalError);
    safeLogger.error(`[API Error][${correlationId}] Code: ${errorCode} | Status: ${statusCode} | Internal: ${rawMsg}`, internalError);
  } else {
    safeLogger.warn(`[API Warning][${correlationId}] Code: ${errorCode} | Status: ${statusCode} | Message: ${safeClientMessage}`);
  }

  const payload: ApiErrorEnvelope = {
    error: safeClientMessage,
    code: errorCode,
    correlationId,
    ...(details ? { details } : {})
  };

  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Correlation-ID', correlationId);
    res.writeHead(statusCode);
    res.end(JSON.stringify(payload));
  }
}
