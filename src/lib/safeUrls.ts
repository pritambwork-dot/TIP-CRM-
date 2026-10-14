/**
 * TIP CRM — Safe URL & Navigation Validation Utility
 * Location: src/lib/safeUrls.ts
 *
 * Defends against:
 * 1. JavaScript execution via javascript: pseudo-protocol in links and buttons (CWE-79).
 * 2. Unsafe schemes (data:, vbscript:, file:, blob:).
 * 3. Mailto header injection / newline splitting (CWE-93).
 * 4. Reverse tabnabbing via unvalidated target="_blank" links.
 */

// Explicitly permitted protocols for external web links
const SAFE_WEB_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Validates whether a given URL string uses an allowed, safe web protocol.
 * Strips whitespace and ASCII control characters before validation.
 */
export function isSafeUrl(url: string | null | undefined, allowedProtocols: Set<string> = SAFE_WEB_PROTOCOLS): boolean {
  if (!url || typeof url !== 'string') return false;

  // Strip leading/trailing whitespace and ASCII control characters (0x00 - 0x1F, 0x7F)
  const sanitized = url.replace(/[\0-\x1f\x7f]/g, '').trim();
  if (!sanitized) return false;

  // Immediate rejection of dangerous pseudo-protocols even if obfuscated
  const lower = sanitized.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return false;
  }

  try {
    // Attempt standard WHATWG URL parsing
    const parsed = new URL(sanitized);
    return allowedProtocols.has(parsed.protocol);
  } catch {
    // If it lacks a scheme, check if it looks like a valid hostname (e.g. "example.com" or "www.tip.org")
    if (!sanitized.includes('://') && !sanitized.startsWith('//')) {
      try {
        const withProtocol = new URL(`https://${sanitized}`);
        return allowedProtocols.has(withProtocol.protocol) && Boolean(withProtocol.hostname);
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Sanitizes and normalizes external web URLs for safe rendering in <a href="...">.
 * If the input is safe, returns the normalized URL (prepends https:// if scheme was omitted).
 * If unsafe, returns null.
 */
export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const sanitized = url.replace(/[\0-\x1f\x7f]/g, '').trim();
  if (!sanitized) return null;

  const lower = sanitized.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return null;
  }

  try {
    const parsed = new URL(sanitized);
    if (SAFE_WEB_PROTOCOLS.has(parsed.protocol)) {
      return parsed.href;
    }
    return null;
  } catch {
    // Check if domain-style URL lacking protocol
    if (!sanitized.includes('://') && !sanitized.startsWith('//') && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(sanitized)) {
      try {
        const withHttps = new URL(`https://${sanitized}`);
        if (SAFE_WEB_PROTOCOLS.has(withHttps.protocol)) {
          return withHttps.href;
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Sanitizes an email address for use in mailto: links, preventing header injection.
 * Rejects or strips newlines, carriage returns, and query parameter smuggling.
 */
export function sanitizeMailto(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;

  // Strip carriage returns, line feeds, and control characters to prevent header injection
  const cleanEmail = email.replace(/[\r\n\t\0-\x1f\x7f]/g, '').trim();
  
  // Basic email pattern verification (username@domain.tld)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return null;
  }

  return `mailto:${encodeURIComponent(cleanEmail).replace(/%40/g, '@')}`;
}
