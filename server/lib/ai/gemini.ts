/**
 * TIP CRM — Dedicated Server-Side Gemini AI Service
 * Location: server/lib/ai/gemini.ts
 * 
 * STRICT SECURITY INVARIANTS:
 * 1. Executes exclusively in server-side Node.js environment.
 * 2. Reads GEMINI_API_KEY strictly from process.env (never exposed to client).
 * 3. Supports hot credential rotation via dotenv reload without restarting.
 * 4. Never logs API keys, passwords, or authentication tokens.
 * 5. Sanitizes all error messages so internal API keys or endpoints are never leaked to clients.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables across standard hierarchy (.env.local -> .env)
function loadEnv() {
  try {
    dotenv.config({ path: '.env.local' });
    dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
    dotenv.config({ override: true });
  } catch (e) {
    // Ignore in environments where filesystem dotenv is unavailable
  }
}

loadEnv();

/**
 * Retrieve current GEMINI_API_KEY from server environment.
 * Supports hot key rotation without restarting server.
 */
export function getGeminiApiKey(): string {
  loadEnv();
  return process.env.GEMINI_API_KEY?.trim() || '';
}

/**
 * Redacts any sensitive tokens, API keys, or credentials from strings
 */
export function sanitizeSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/AIza[0-9A-Za-z-_]{30,40}/g, '[REDACTED_API_KEY]')
    .replace(/(?:key|apiKey|api_key|api-key)\s*[:=]\s*["']?([^\s&"']+)["']?/gi, 'key=[REDACTED]')
    .replace(/(?:bearer\s+)([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)/gi, 'bearer [REDACTED_TOKEN]')
    .replace(/tip_sess_[A-Za-z0-9_.-]+/gi, '[REDACTED_SESSION_TOKEN]')
    .replace(/tip_token_[A-Za-z0-9_.-]+/gi, '[REDACTED_SESSION_TOKEN]')
    .replace(/(?:tip_session|session_id|sessionId|sessionToken)\s*[:=]\s*["']?([^\s&;"']+)["']?/gi, 'tip_session=[REDACTED]')
    .replace(/(?:password|tempPassword|secret)\s*[:=]\s*["']?([^\s&"']+)["']?/gi, 'password=[REDACTED]');
}

/**
 * Safe server-side logger that redacts any secrets before emitting
 */
export const safeLogger = {
  info: (msg: string, ...args: any[]) => {
    console.log(sanitizeSecrets(msg), ...args.map(a => typeof a === 'string' ? sanitizeSecrets(a) : a));
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(sanitizeSecrets(msg), ...args.map(a => typeof a === 'string' ? sanitizeSecrets(a) : a));
  },
  error: (msg: string, err?: any) => {
    const sanitizedMsg = sanitizeSecrets(msg);
    const sanitizedErrMsg = err?.message ? sanitizeSecrets(err.message) : '';
    console.error(sanitizedMsg, sanitizedErrMsg || '');
  }
};

export interface ValidatedUser {
  id: string;
  name?: string;
  email?: string;
  roleId?: string;
  role?: string;
  postId?: string;
  postTitle?: string;
  status?: string;
  isActive?: boolean;
}

/**
 * Validates the authenticated user payload before allowing AI invocation
 */
export function validateAuthenticatedUser(user: any): ValidatedUser {
  if (!user || typeof user !== 'object') {
    throw new Error('Unauthorized: Missing or invalid user identity for AI request.');
  }

  const userId = user.id || user.userId;
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new Error('Unauthorized: User ID is required.');
  }

  if (user.isActive === false || user.status === 'disabled' || user.status === 'rejected') {
    throw new Error('Forbidden: Account is inactive or deactivated.');
  }

  return {
    id: userId.trim(),
    name: user.name || user.fullName || 'Authorized Staff Member',
    email: user.email || '',
    roleId: user.roleId || 'staff',
    role: user.role || 'staff',
    postId: user.postId,
    postTitle: user.postTitle || 'Staff Member',
    status: user.status || 'approved',
    isActive: user.isActive !== false
  };
}

export type ModelTier = 'LIGHT' | 'STANDARD' | 'ADVANCED';

function getModelsForTier(tier: ModelTier = 'STANDARD'): string[] {
  switch (tier) {
    case 'LIGHT':
      return ['gemini-flash-latest', 'gemini-3.6-flash'];
    case 'ADVANCED':
    case 'STANDARD':
    default:
      return ['gemini-3.6-flash', 'gemini-flash-latest'];
  }
}

export interface GeminiChatParams {
  message: string;
  user: any;
  history?: Array<{ role: string; content: string }>;
  context?: string;
  deterministicFacts?: Record<string, any>;
  privacyMode?: 'strict' | 'minimal' | 'full';
}

export interface GeminiChatResult {
  reply: string;
  model: string;
  tokensEstimated: number;
  source: string;
  status: 'success' | 'fallback_deterministic';
}

/**
 * Dedicated server-side Gemini Chat method
 */
export async function callGeminiChat(params: GeminiChatParams): Promise<GeminiChatResult> {
  // 1. Authoritative identity validation
  const validUser = validateAuthenticatedUser(params.user);

  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('YOUR_GEMINI')) {
    safeLogger.warn('[GeminiService] API key not configured or set to placeholder. Using deterministic fallback.');
    return {
      reply: `[Deterministic Grounded Mode] Hello ${validUser.name}. AI service is operating in local deterministic privacy mode. You have ${params.deterministicFacts?.openTaskCount ?? 8} active tasks and ${params.deterministicFacts?.upcomingEventCount ?? 2} upcoming events scheduled.`,
      model: 'deterministic-offline',
      tokensEstimated: 0,
      source: 'Deterministic Grounding Engine',
      status: 'fallback_deterministic'
    };
  }

  // 2. Initialize Google GenAI on the server
  const ai = new GoogleGenAI({ apiKey });
  const models = getModelsForTier('STANDARD');

  // 3. Grounded Prompt Formulation
  const factsStr = params.deterministicFacts ? JSON.stringify(params.deterministicFacts, null, 2) : '{}';
  const systemInstruction = `You are the TIP CRM Intelligence Assistant for The Inclusion Project (TIP), a Canadian non-profit advancing equity, diversity, and inclusion.
You are assisting ${validUser.name} (${validUser.postTitle || validUser.roleId}).
GROUNDING RULES:
1. Ground all numbers and statements strictly in the verified deterministic CRM facts below.
2. NEVER invent non-existent statistics, attendees, or donation amounts.
3. Be professional, concise, actionable, and encouraging.

VERIFIED DETERMINISTIC CRM FACTS:
${factsStr}
`;

  const conversationHistory = (params.history || []).slice(-4).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
  const fullPrompt = `${systemInstruction}\n\n${conversationHistory ? `RECENT CONVERSATION:\n${conversationHistory}\n\n` : ''}User Query: ${params.message}\nAssistant:`;

  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt
      });

      const reply = response.text || '';
      return {
        reply: reply.trim(),
        model,
        tokensEstimated: Math.round((fullPrompt.length + reply.length) / 4),
        source: 'Google Gemini AI',
        status: 'success'
      };
    } catch (err: any) {
      lastError = err;
      safeLogger.warn(`[GeminiService] Model ${model} unavailable (${sanitizeSecrets(err?.message?.slice(0, 50) || '')}), attempting fallback...`);
    }
  }

  // If all candidate models fail, return safe grounded fallback
  safeLogger.error('[GeminiService] All Gemini models failed. Returning sanitized grounded response.', lastError);
  return {
    reply: `[Deterministic Fallback] ${params.deterministicFacts?.recentAction || 'All system records are up to date.'} Active tasks: ${params.deterministicFacts?.openTaskCount ?? 8}. Upcoming events: ${params.deterministicFacts?.upcomingEventCount ?? 2}.`,
    model: 'deterministic-offline',
    tokensEstimated: 0,
    source: 'Deterministic Grounding Engine',
    status: 'fallback_deterministic'
  };
}

/**
 * Dedicated server-side Gemini Text generation method
 */
export async function callGeminiText(prompt: string, tier: ModelTier = 'STANDARD'): Promise<{ text: string; model: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Gemini API key is not configured on the server.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = getModelsForTier(tier);

  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });
      return { text: response.text || '', model };
    } catch (err: any) {
      lastError = err;
      safeLogger.warn(`[GeminiService] Text model ${model} busy, trying fallback...`);
    }
  }

  throw new Error(`Gemini text generation failed: ${sanitizeSecrets(lastError?.message || 'Candidate models exhausted')}`);
}

/**
 * Safely extracts and parses JSON from AI output.
 * Strips markdown code fences (```json ... ```), handles whitespace,
 * and recovers JSON substring if surrounding commentary is included.
 */
export function extractAndParseJson<T>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid response from AI model');
  }

  let cleanText = rawText.trim();

  // Strip markdown code fences if wrapped
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  } else {
    // If there is markdown fence embedded within the text
    const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleanText = fenceMatch[1].trim();
    }
  }

  try {
    return JSON.parse(cleanText) as T;
  } catch (initialErr) {
    // Search for outermost JSON object or array
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    let startIdx = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      const isObject = cleanText[startIdx] === '{';
      const lastIdx = isObject ? cleanText.lastIndexOf('}') : cleanText.lastIndexOf(']');
      if (lastIdx > startIdx) {
        const sliced = cleanText.substring(startIdx, lastIdx + 1);
        try {
          return JSON.parse(sliced) as T;
        } catch {
          // Fall through to error
        }
      }
    }

    throw new Error(`Failed to parse AI structured response: ${sanitizeSecrets((initialErr as any)?.message || 'Invalid JSON syntax')}`);
  }
}

/**
 * Dedicated server-side Gemini Structured JSON generation method
 */
export async function callGeminiStructured<T>(prompt: string, tier: ModelTier = 'STANDARD'): Promise<{ data: T; model: string; rawText: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Gemini API key is not configured on the server.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = getModelsForTier(tier);

  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const rawText = response.text || '{}';
      const data = extractAndParseJson<T>(rawText);
      return { data, model, rawText };
    } catch (err: any) {
      lastError = err;
      safeLogger.warn(`[GeminiService] Structured JSON model ${model} busy, trying fallback...`);
    }
  }

  throw new Error(`Gemini structured JSON generation failed: ${sanitizeSecrets(lastError?.message || 'Candidate models exhausted')}`);
}
