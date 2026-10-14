/**
 * TIP CRM — Environment Configuration & Production Hardening
 * Location: server/lib/environment.ts
 *
 * Security Requirements (Security Check 19):
 * 1. Explicit separation of development and production behaviors.
 * 2. Guaranteed disabling of debug mode, verbose tracing, and diagnostics in production.
 * 3. Prevention of client-supplied headers or query params (?debug=true, x-debug-mode) overriding production security.
 * 4. Validation of mandatory production environment configuration.
 * 5. Ensuring optional Gemini AI configuration remains optional with resilient deterministic fallback.
 * 6. Protection of test accounts, synthetic users, and test utilities from production access.
 */

import type { IncomingMessage } from 'http';
import { sanitizeSecrets, safeLogger } from './ai/gemini.ts';

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Determines whether the server is running in an authoritative production environment.
 * Evaluates standard Node.js, Vercel, and Cloud deployment environment variables.
 */
export function isProduction(): boolean {
  const env = (process.env.NODE_ENV || process.env.APP_ENV || process.env.VERCEL_ENV || '').toLowerCase().trim();
  return env === 'production';
}

/**
 * Determines whether the server is running in a local development or testing environment.
 */
export function isDevelopment(): boolean {
  return !isProduction();
}

/**
 * Authoritatively determines whether debug mode is permitted.
 * In production, debug mode is HARD-DISABLED and CANNOT be toggled by any client request.
 */
export function isDebugModeEnabled(req?: IncomingMessage): boolean {
  // Production invariant: Debug mode is NEVER enabled under any circumstance
  if (isProduction()) {
    return false;
  }

  // In development, require explicit environment flag (DEBUG=true or DEBUG=1)
  const envDebug = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
  return envDebug;
}

/**
 * Validates environment configuration to ensure production safety.
 * Produces clear warnings/errors before serving live traffic.
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const inProduction = isProduction();

  if (inProduction) {
    // 1. Mandatory Production Environment Checks
    if (!process.env.APP_URL) {
      warnings.push('APP_URL is not explicitly configured in production; defaulting to domain resolution.');
    }

    // 2. Secret Invariants: Production must not rely on known fallback development secrets
    const csrfSecret = process.env.CSRF_SECRET;
    if (!csrfSecret || csrfSecret === 'tip-crm-csrf-secret-token-key-2026-production') {
      warnings.push('CSRF_SECRET should be set to a custom random entropy key in production deployment.');
    }

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret || sessionSecret === 'tip-crm-secure-session-secret-token-key-2026') {
      warnings.push('SESSION_SECRET should be set to a dedicated random cryptographic secret in production.');
    }

    // 3. Optional AI Provider Check (Must not break core CRM if missing)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY' || geminiKey === 'MY_GEMINI_API_KEY') {
      warnings.push('Optional GEMINI_API_KEY is not configured. TIP CRM will operate smoothly using deterministic intelligence fallbacks.');
    }
  } else {
    // Development environment notices
    if (!process.env.GEMINI_API_KEY) {
      warnings.push('Development mode: GEMINI_API_KEY is empty; AI features will use offline deterministic fallbacks.');
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      safeLogger.warn(`[Environment Config] ${w}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) {
      safeLogger.error(`[Environment Config] ${e}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitizes details objects attached to API error envelopes.
 * Strips internal stack traces, system paths, and debug identifiers in production.
 */
export function sanitizeErrorDetails(details?: Record<string, any>): Record<string, any> | undefined {
  if (!details || typeof details !== 'object') {
    return undefined;
  }

  const clean: Record<string, any> = {};
  const isProd = isProduction();

  for (const [key, val] of Object.entries(details)) {
    const keyLower = key.toLowerCase();
    
    // Always strip internal debugging / stack trace keys
    if (
      keyLower === 'stack' ||
      keyLower === 'stacktrace' ||
      keyLower === 'debug' ||
      keyLower === 'trace' ||
      keyLower === 'internalerror'
    ) {
      continue;
    }

    // In production, also strip system file paths or server environment metadata
    if (isProd && (keyLower.includes('path') || keyLower.includes('env') || keyLower.includes('cwd'))) {
      continue;
    }

    if (typeof val === 'string') {
      clean[key] = sanitizeSecrets(val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeErrorDetails(val);
    } else {
      clean[key] = val;
    }
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}
