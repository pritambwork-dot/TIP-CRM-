/**
 * TIP CRM — Model Independence & Provider Abstraction (Sections 32, 65)
 * Allows plugging in Gemini, Groq, OpenRouter, or Local models without changing CRM logic.
 */

import { GoogleGenAI } from '@google/genai';
import { sanitizeSecrets, safeLogger, extractAndParseJson } from './lib/ai/gemini.ts';

export type ModelTier = 'LIGHT' | 'STANDARD' | 'ADVANCED';

export interface AIProvider {
  name: string;
  generateText(prompt: string, tier?: ModelTier): Promise<{ text: string; model: string }>;
  generateStructured<T>(prompt: string, tier?: ModelTier): Promise<{ data: T; model: string; rawText: string }>;
}

export class GeminiProvider implements AIProvider {
  public name = 'Google Gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async executeWithFallback<R>(call: (ai: GoogleGenAI, model: string) => Promise<R>): Promise<R> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${m} timed out after 6s`)), 6000)
        );
        return await Promise.race([call(ai, m), timeoutPromise]);
      } catch (err: any) {
        lastError = err;
        safeLogger.warn(`[GeminiProvider] ${m} busy (${sanitizeSecrets(err?.message?.slice(0, 60) || '')}), trying fallback...`);
      }
    }
    throw new Error(`All Gemini candidate models unavailable: ${sanitizeSecrets(lastError?.message || '')}`);
  }

  public async generateText(prompt: string, _tier: ModelTier = 'STANDARD'): Promise<{ text: string; model: string }> {
    return this.executeWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return { text: response.text || '', model };
    });
  }

  public async generateStructured<T>(prompt: string, _tier: ModelTier = 'STANDARD'): Promise<{ data: T; model: string; rawText: string }> {
    return this.executeWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const rawText = response.text || '{}';
      const data = extractAndParseJson<T>(rawText);
      return { data, model, rawText };
    });
  }
}

/**
 * Provider Factory (Section 65)
 */
export function createAiProvider(_provider = 'gemini', apiKey: string = ''): AIProvider {
  return new GeminiProvider(apiKey || _provider);
}

