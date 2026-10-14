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

  private getModelForTier(tier: ModelTier = 'STANDARD'): string {
    switch (tier) {
      case 'LIGHT':
        // Fast and cost-efficient for basic phrasing, drafts, and short summaries
        return 'gemini-flash-latest';
      case 'STANDARD':
      case 'ADVANCED':
      default:
        // Capable, accurate flash model for multi-factor analysis
        return 'gemini-3.6-flash';
    }
  }

  public async generateText(prompt: string, tier: ModelTier = 'STANDARD'): Promise<{ text: string; model: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const primaryModel = this.getModelForTier(tier);
    const candidateModels = primaryModel === 'gemini-3.6-flash' 
      ? ['gemini-3.6-flash', 'gemini-flash-latest']
      : ['gemini-flash-latest', 'gemini-3.6-flash'];

    let lastError: any = null;
    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt
        });
        return { text: response.text || '', model: m };
      } catch (err: any) {
        lastError = err;
        safeLogger.warn(`[GeminiProvider] ${m} busy (${sanitizeSecrets(err?.message?.slice(0, 60) || '')}), trying fallback...`);
      }
    }
    throw new Error(`All Gemini candidate models unavailable: ${sanitizeSecrets(lastError?.message || '')}`);
  }

  public async generateStructured<T>(prompt: string, tier: ModelTier = 'STANDARD'): Promise<{ data: T; model: string; rawText: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const primaryModel = this.getModelForTier(tier);
    const candidateModels = primaryModel === 'gemini-3.6-flash' 
      ? ['gemini-3.6-flash', 'gemini-flash-latest']
      : ['gemini-flash-latest', 'gemini-3.6-flash'];

    let lastError: any = null;
    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const rawText = response.text || '{}';
        const data = extractAndParseJson<T>(rawText);
        return { data, model: m, rawText };
      } catch (err: any) {
        lastError = err;
        safeLogger.warn(`[GeminiProvider] Structured ${m} busy (${sanitizeSecrets(err?.message?.slice(0, 60) || '')}), trying fallback...`);
      }
    }
    throw new Error(`All Gemini candidate models unavailable for structured JSON: ${sanitizeSecrets(lastError?.message || '')}`);
  }
}

/**
 * Provider Factory (Section 65)
 */
export function createAiProvider(providerType: 'gemini' | 'groq' | 'local', apiKey: string): AIProvider {
  switch (providerType) {
    case 'gemini':
    default:
      return new GeminiProvider(apiKey);
  }
}
