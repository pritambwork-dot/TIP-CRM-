/**
 * TIP CRM — Server AI Provider (Gemini Integration)
 */

import { GoogleGenAI } from '@google/genai';
import { sanitizeSecrets } from './lib/ai/gemini.ts';

export type ModelTier = 'LIGHT' | 'STANDARD' | 'ADVANCED';

export interface AIProvider {
  name: string;
  generateText(prompt: string, tier?: ModelTier): Promise<{ text: string; model: string }>;
  generateStructured<T>(prompt: string, tier?: ModelTier): Promise<{ data: T; model: string; rawText: string }>;
}

export class GeminiProvider implements AIProvider {
  public name = 'TIP Intelligence';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async executeWithFallback<R>(call: (ai: GoogleGenAI, model: string) => Promise<R>): Promise<R> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        return await call(ai, m);
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiProvider] ${m} busy (${sanitizeSecrets(err?.message?.slice(0, 60) || '')}), trying fallback...`);
      }
    }
    throw new Error(`All Gemini models unavailable: ${sanitizeSecrets(lastError?.message || '')}`);
  }

  public async generateText(prompt: string, _tier?: ModelTier): Promise<{ text: string; model: string }> {
    return this.executeWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return { text: response.text || '', model };
    });
  }

  public async generateStructured<T>(prompt: string, _tier?: ModelTier): Promise<{ data: T; model: string; rawText: string }> {
    return this.executeWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const rawText = response.text || '{}';
      return { data: JSON.parse(rawText) as T, model, rawText };
    });
  }
}

export function createAiProvider(_type: 'gemini' | 'groq' | 'local' = 'gemini', apiKey: string): AIProvider {
  return new GeminiProvider(apiKey);
}
