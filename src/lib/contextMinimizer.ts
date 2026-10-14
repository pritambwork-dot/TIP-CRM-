/**
 * TIP CRM — Context Minimizer & PII Scrubber
 * Implements strict data privacy & token minimization (Sections 36, 37, 38, 39, 40, 68, 69):
 * 1. PII Stripping: Scrubs emails, phone numbers, street addresses, and private notes.
 * 2. Prunes unrelated CRM tables: only transmits entities directly relevant to the query.
 * 3. Compresses structured data into statistical aggregates instead of row-by-row lists.
 * 4. Truncates and compresses conversational history to avoid prompt inflation.
 */

import { AiPrivacyMode, UserProfile } from '../types';

export interface MinimizedContextOptions {
  privacyMode?: AiPrivacyMode;
  maxHistoryItems?: number;
  anonymizeNames?: boolean;
}

/**
 * Scrubs any email, phone number, or street address from a string
 */
export function scrubPii(text: string): string {
  if (!text) return text;
  
  // Replace email addresses
  let cleaned = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
  
  // Replace Canadian / North American phone numbers
  cleaned = cleaned.replace(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, '[PHONE REDACTED]');
  
  // Replace street address patterns (e.g. "123 Main St", "Suite 400")
  cleaned = cleaned.replace(/\b\d+\s+[A-Za-z0-9\s,.-]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Suite|Drive|Dr|Way)\b/gi, '[ADDRESS REDACTED]');

  return cleaned;
}

/**
 * Minimizes and redacts context payload before dispatching to AI model.
 */
export function minimizeAiPayload(
  payload: Record<string, any>,
  privacyMode: AiPrivacyMode = 'minimal'
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(payload)) {
    if (val === undefined || val === null) continue;

    // Prune completely forbidden PII fields in Minimal & Balanced modes
    if (privacyMode !== 'expanded') {
      if (['email', 'phone', 'address', 'postalCode', 'notes', 'sin', 'bankAccount'].includes(key)) {
        continue;
      }
    }

    if (typeof val === 'string') {
      result[key] = scrubPii(val);
    } else if (Array.isArray(val)) {
      // Compress participant arrays to count summaries instead of raw individual records
      if (key === 'participants' || key === 'people') {
        result[`${key}Count`] = val.length;
        if (privacyMode === 'minimal') {
          // In minimal mode, omit individual row objects entirely
          continue;
        } else {
          // In balanced mode, provide minimal sanitized items (max 5)
          result[key] = val.slice(0, 5).map(item => ({
            id: item.id,
            name: scrubPii(item.name || 'Participant'),
            status: item.status
          }));
        }
      } else {
        result[key] = val.slice(0, 10).map(item => 
          typeof item === 'object' ? minimizeAiPayload(item, privacyMode) : item
        );
      }
    } else if (typeof val === 'object') {
      result[key] = minimizeAiPayload(val, privacyMode);
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Truncates and summarizes conversational history to save tokens (Section 40)
 */
export function minimizeConversationHistory(
  history: Array<{ role: string; content: string }>,
  maxTurns: number = 4
): Array<{ role: string; content: string }> {
  if (!history || history.length === 0) return [];

  // Take only the most recent turns
  const recent = history.slice(-maxTurns);

  return recent.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: scrubPii(msg.content.slice(0, 500)) // Cap per-message length to 500 chars
  }));
}
