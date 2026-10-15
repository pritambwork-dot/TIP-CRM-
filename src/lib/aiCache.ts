/**
 * TIP CRM — Intelligent Hash-Based AI Response Cache
 * Implements Sections 10, 11, 12, 17, 41, 42, 63, 66:
 * - Hash-based context caching: reuse previous AI results when data hasn't changed.
 * - Time-based refreshes (Daily brief: 1/day, Program summary: max 1/24h).
 * - Tracks cache hit rate and estimated tokens saved.
 * - Invalidation when relevant CRM dataVersion increments.
 */

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  dataVersion: number;
  createdAt: number;
  expiresAt: number;
  estimatedTokensSaved: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  tokensSaved: number;
  entriesCount: number;
}

class AiCacheManager {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private tokensSaved = 0;

  /**
   * Fast, stable string hashing (Murmur-style 32-bit hash converted to hex)
   */
  public hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate a standardized cache key
   */
  public generateKey(params: {
    feature: string;
    userId?: string;
    scopeId?: string;
    contextPayload: any;
    promptVersion?: string;
  }): string {
    const { feature, userId = 'global', scopeId = 'default', contextPayload, promptVersion = 'v1' } = params;
    const serialized = typeof contextPayload === 'string' ? contextPayload : JSON.stringify(contextPayload);
    const payloadHash = this.hashString(serialized);
    return `aicache_${feature}_${userId}_${scopeId}_${promptVersion}_${payloadHash}`;
  }

  /**
   * Retrieve cached item if valid and dataVersion matches
   */
  public get<T>(key: string, currentDataVersion: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    // Invalidate if expired or if data version updated
    if (now > entry.expiresAt || entry.dataVersion < currentDataVersion) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    this.tokensSaved += entry.estimatedTokensSaved;
    return entry.data as T;
  }

  /**
   * Store item in cache with TTL and token estimate
   */
  public set<T>(
    key: string, 
    data: T, 
    dataVersion: number, 
    ttlMs: number = 4 * 60 * 60 * 1000, // 4 hours default
    estimatedTokens: number = 650
  ): void {
    const now = Date.now();
    this.cache.set(key, {
      key,
      data,
      dataVersion,
      createdAt: now,
      expiresAt: now + ttlMs,
      estimatedTokensSaved: estimatedTokens
    });
  }

  /**
   * Invalidate entries matching a prefix or scope
   */
  public invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate entire cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Observability telemetry
   */
  public getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      tokensSaved: this.tokensSaved,
      entriesCount: this.cache.size
    };
  }

  /**
   * Suggestion deduplication helper (Section 17, 54)
   * Tracks dismissed suggestions to enforce 7-day cooldown
   */
  public isSuggestionDismissed(suggestionHash: string, userDismissals: Record<string, string>): boolean {
    const dismissedAt = userDismissals[suggestionHash];
    if (!dismissedAt) return false;

    const dismissedTime = new Date(dismissedAt).getTime();
    const cooldownDays = 7;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

    return Date.now() - dismissedTime < cooldownMs;
  }
}

export const aiCache = new AiCacheManager();
