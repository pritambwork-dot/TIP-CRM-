/**
 * TIP CRM — Restrictive CORS Configuration & CSRF Protection Middleware
 * Location: server/lib/corsCsrf.ts
 *
 * Security Requirements (Security Check 16):
 * 1. Restrict CORS to explicitly approved origins (never unrestricted wildcard '*' in production).
 * 2. Never reflect arbitrary Origin headers into Access-Control-Allow-Origin.
 * 3. Never combine Access-Control-Allow-Credentials: true with wildcard '*'.
 * 4. Separate development and production origins.
 * 5. Handle preflight OPTIONS requests strictly (204 No Content for allowed, 403 Forbidden for unapproved).
 * 6. CSRF defenses:
 *    - Origin & Referer verification on all state-changing requests (POST, PUT, PATCH, DELETE).
 *    - Custom header requirement (Content-Type: application/json, X-Requested-With, X-CSRF-Token).
 *    - Double-submit / synchronizer CSRF token validation for cookie-authenticated sessions.
 *    - Secure cookie attributes (SameSite=Lax/Strict, Secure, HttpOnly).
 */

import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { safeLogger } from './ai/gemini.ts';

// Server-side CSRF secret
const CSRF_SECRET = process.env.CSRF_SECRET || 'tip-crm-csrf-secret-token-key-2026-production';

// Explicitly approved production and development origins
export const BASE_ALLOWED_ORIGINS = [
  // Local development origins
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Official Production Domains
  'https://tip-crm.vercel.app',
  'https://www.theinclusionproject.ca',
  'https://theinclusionproject.com',
  'https://www.theinclusionproject.com',
  'https://crm.theinclusionproject.ca',
  'https://theinclusionproject.ca'
];

/**
 * Returns the authoritative set of permitted origins, merging environment configurations.
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  
  return Array.from(new Set([...BASE_ALLOWED_ORIGINS, ...envOrigins]));
}

/**
 * Validates whether an incoming request Origin is permitted by policy.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || typeof origin !== 'string') return false;

  const normalized = origin.trim().replace(/\/$/, '');
  const allowedList = getAllowedOrigins();

  // 1. Exact match against approved list
  if (allowedList.some(o => o.replace(/\/$/, '') === normalized)) {
    return true;
  }

  // 2. Safe preview deployment match (Strict regex for Vercel team previews)
  // Example: https://tip-crm-git-feature-branch.vercel.app
  if (/^https:\/\/tip-crm(-[a-zA-Z0-9_-]+)?\.vercel\.app$/.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Generates a cryptographically signed CSRF token bound to a session or actor.
 */
export function generateCsrfToken(sessionId: string = 'anon'): string {
  const timestamp = Date.now().toString(36);
  const data = `${sessionId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', CSRF_SECRET).update(data).digest('hex').slice(0, 32);
  return `${data}:${hmac}`;
}

/**
 * Verifies a CSRF token signature, timestamp window, and session binding.
 */
export function verifyCsrfToken(token: string | undefined, sessionId: string = 'anon'): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [tokenSessionId, timestampStr, signature] = parts;

  // Max validity: 24 hours
  const timestamp = parseInt(timestampStr, 36);
  if (isNaN(timestamp) || Date.now() - timestamp > 86400 * 1000 || timestamp > Date.now() + 60000) {
    return false;
  }

  // Session binding check
  if (sessionId !== 'anon' && tokenSessionId !== 'anon' && tokenSessionId !== sessionId) {
    return false;
  }

  const expectedData = `${tokenSessionId}:${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', CSRF_SECRET).update(expectedData).digest('hex').slice(0, 32);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

export interface CorsResult {
  handled: boolean;
  originAllowed: boolean;
  origin?: string;
}

/**
 * Applies restrictive CORS headers to an HTTP response.
 * Handles OPTIONS preflight immediately (204 for allowed, 403 for disallowed).
 */
export function handleCors(req: IncomingMessage, res: ServerResponse): CorsResult {
  const origin = req.headers['origin'] as string | undefined;
  const isPreflight = req.method === 'OPTIONS';

  // Always set Vary: Origin to prevent caching responses for incorrect origins
  res.setHeader('Vary', 'Origin');

  if (!origin) {
    // Same-origin or server-to-server request lacking Origin header
    if (isPreflight) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing Origin header in CORS preflight request' }));
      return { handled: true, originAllowed: false };
    }
    return { handled: false, originAllowed: true };
  }

  const allowed = isAllowedOrigin(origin);

  if (allowed) {
    // Set explicit allowed origin — NEVER wildcard '*' with credentials
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Name, X-CSRF-Token, X-Requested-With'
    );
    res.setHeader('Access-Control-Max-Age', '86400');

    if (isPreflight) {
      res.writeHead(204);
      res.end();
      return { handled: true, originAllowed: true, origin };
    }

    return { handled: false, originAllowed: true, origin };
  } else {
    // Disallowed origin: NEVER reflect untrusted origin, NEVER set Access-Control-Allow-Origin
    safeLogger.warn(`[CORS Blocked] Request from untrusted origin: ${origin}`);

    if (isPreflight) {
      res.writeHead(403, { 
        'Content-Type': 'application/json',
        'Vary': 'Origin'
      });
      res.end(JSON.stringify({ 
        error: 'Forbidden: Cross-Origin Resource Sharing (CORS) origin not permitted.',
        code: 'FORBIDDEN'
      }));
      return { handled: true, originAllowed: false, origin };
    }

    return { handled: false, originAllowed: false, origin };
  }
}

/**
 * Validates Cross-Site Request Forgery (CSRF) protections on state-changing requests.
 * Returns { valid: true } if allowed, or { valid: false, statusCode, error, code } if blocked.
 */
export function validateCsrf(req: IncomingMessage): {
  valid: boolean;
  statusCode?: number;
  error?: string;
  code?: string;
} {
  const method = (req.method || 'GET').toUpperCase();

  // Safe HTTP methods do not change state
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { valid: true };
  }

  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;

  // 1. Origin Header Validation
  if (origin) {
    if (!isAllowedOrigin(origin)) {
      safeLogger.warn(`[CSRF Blocked] State-changing ${method} request with unauthorized Origin: ${origin}`);
      return {
        valid: false,
        statusCode: 403,
        error: 'Forbidden: Cross-Site Request Forgery (CSRF) blocked. Request origin is not permitted.',
        code: 'FORBIDDEN'
      };
    }
  } else if (referer) {
    // If Origin is missing, validate Referer
    try {
      const refUrl = new URL(referer);
      if (!isAllowedOrigin(refUrl.origin)) {
        safeLogger.warn(`[CSRF Blocked] State-changing ${method} request with unauthorized Referer: ${referer}`);
        return {
          valid: false,
          statusCode: 403,
          error: 'Forbidden: Cross-Site Request Forgery (CSRF) blocked. Request referer is not permitted.',
          code: 'FORBIDDEN'
        };
      }
    } catch {
      return {
        valid: false,
        statusCode: 403,
        error: 'Forbidden: Malformed Referer header.',
        code: 'FORBIDDEN'
      };
    }
  }

  // 2. Cookie-authenticated session CSRF check
  // If the request carries ambient session cookies, a valid CSRF token header is mandatory
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader && typeof cookieHeader === 'string' && (cookieHeader.includes('session') || cookieHeader.includes('tip_'))) {
    const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
    if (!csrfHeader || !verifyCsrfToken(csrfHeader)) {
      safeLogger.warn(`[CSRF Blocked] Cookie-authenticated request missing or provided invalid X-CSRF-Token.`);
      return {
        valid: false,
        statusCode: 403,
        error: 'Forbidden: CSRF token missing or invalid for cookie-authenticated request.',
        code: 'FORBIDDEN'
      };
    }
  }

  // 3. Simple Form Submission / Content-Type Defense
  // HTML form POST without custom headers or standard JSON Content-Type is rejected for API routes
  const contentType = req.headers['content-type'] || '';
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    (contentType.includes('multipart/form-data') && !req.headers['x-requested-with'] && !req.headers['x-csrf-token'])
  ) {
    // Only permit if origin was verified and not an untrusted cross-site form post
    if (!origin && !referer) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Bad Request: State-changing API requests require application/json or explicit custom headers.',
        code: 'BAD_REQUEST'
      };
    }
  }

  return { valid: true };
}
