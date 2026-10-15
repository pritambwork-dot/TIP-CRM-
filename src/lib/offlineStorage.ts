/**
 * TIP CRM - Native Offline Storage & Resilient Write Queue
 *
 * Provides structured IndexedDB caching and a persistent write queue
 * with idempotency keys, base-version conflict detection, and user isolation.
 *
 * Rules:
 * - Zero external dependencies (native IndexedDB + standard Web APIs).
 * - Multi-tenant safe: Every cache entry and mutation is strictly partitioned by userId.
 * - In-memory fallback for SSR, Node.js testing, and unsupported browsers.
 * - Sensitive records purged automatically on logout via clearUserOfflineCache().
 */

export interface OfflineCachedResource<T = any> {
  key: string; // `${userId}:${resource}`
  userId: string;
  resource: string;
  data: T;
  cachedAt: number;
  ttlMs: number;
  version: number;
}

export type OfflineOpType = 'create' | 'update' | 'delete';
export type OfflineOpStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export interface OfflineMutation<T = any> {
  opId: string;
  idempotencyKey: string;
  userId: string;
  resource: string;
  recordId: string;
  opType: OfflineOpType;
  payload: T;
  baseVersion: number;
  clientTimestamp: number;
  status: OfflineOpStatus;
  retryCount: number;
  lastError?: string;
  conflictDetails?: {
    serverVersion?: number;
    serverRecord?: any;
    resolvedAt?: number;
  };
}

const DB_NAME = 'tip_crm_offline_db';
const DB_VERSION = 1;
const STORE_RECORDS = 'records_cache';
const STORE_QUEUE = 'write_queue';

// 24 hours default TTL for cached resource records
export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory fallback stores when IndexedDB is unavailable (SSR, Node tests)
const memoryCacheStore = new Map<string, OfflineCachedResource>();
const memoryQueueStore = new Map<string, OfflineMutation>();

/**
 * Returns true if native IndexedDB is available in the current environment
 */
export function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

/**
 * Open or initialize the TIP CRM IndexedDB database
 */
let dbPromise: Promise<IDBDatabase | null> | null = null;

export function initOfflineDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbSupported()) {
    return Promise.resolve(null);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Cache for CRM entity tables (isolated by user)
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          const recordStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'key' });
          recordStore.createIndex('by_user', 'userId', { unique: false });
          recordStore.createIndex('by_resource', 'resource', { unique: false });
          recordStore.createIndex('by_cached_at', 'cachedAt', { unique: false });
        }

        // Store 2: Bounded, persistent offline write queue
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: 'opId' });
          queueStore.createIndex('by_user', 'userId', { unique: false });
          queueStore.createIndex('by_status', 'status', { unique: false });
          queueStore.createIndex('by_timestamp', 'clientTimestamp', { unique: false });
          queueStore.createIndex('by_idempotency', 'idempotencyKey', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = () => {
        // Fall back gracefully to memory store on permission denial (e.g. private mode)
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Generate a unique idempotency key or opId
 */
export function generateOfflineId(prefix = 'op'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================================================
// STORE 1: RECORD CACHING WITH USER ISOLATION AND TTL
// ============================================================================

/**
 * Cache resource records for a specific authenticated user.
 */
export async function cacheResource<T>(
  userId: string,
  resource: string,
  data: T,
  ttlMs = DEFAULT_CACHE_TTL_MS,
  version = 1
): Promise<void> {
  const compositeKey = `${userId}:${resource}`;
  const record: OfflineCachedResource<T> = {
    key: compositeKey,
    userId,
    resource,
    data,
    cachedAt: Date.now(),
    ttlMs,
    version,
  };

  const db = await initOfflineDb();
  if (!db) {
    memoryCacheStore.set(compositeKey, record);
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        memoryCacheStore.set(compositeKey, record);
        resolve();
      };
    } catch {
      memoryCacheStore.set(compositeKey, record);
      resolve();
    }
  });
}

/**
 * Retrieve cached resource records for a specific authenticated user.
 * Returns null if record is missing, expired, or belongs to a different user.
 */
export async function getCachedResource<T>(
  userId: string,
  resource: string
): Promise<{ data: T; cachedAt: number; version: number } | null> {
  const compositeKey = `${userId}:${resource}`;
  const db = await initOfflineDb();

  if (!db) {
    const item = memoryCacheStore.get(compositeKey);
    if (!item) return null;
    if (Date.now() - item.cachedAt > item.ttlMs) {
      memoryCacheStore.delete(compositeKey);
      return null;
    }
    return { data: item.data as T, cachedAt: item.cachedAt, version: item.version };
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const request = store.get(compositeKey);

      request.onsuccess = () => {
        const item = request.result as OfflineCachedResource<T> | undefined;
        if (!item) {
          resolve(null);
          return;
        }

        // Check user match and expiration
        if (item.userId !== userId || Date.now() - item.cachedAt > item.ttlMs) {
          resolve(null);
          return;
        }

        resolve({ data: item.data, cachedAt: item.cachedAt, version: item.version });
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Clear cached records for a specific user upon logout to ensure privacy.
 */
export async function clearUserOfflineCache(userId: string): Promise<void> {
  // Clear from memory store
  for (const [key, item] of memoryCacheStore.entries()) {
    if (item.userId === userId) {
      memoryCacheStore.delete(key);
    }
  }

  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const index = store.index('by_user');
      const request = index.getAllKeys(IDBKeyRange.only(userId));

      request.onsuccess = () => {
        const keys = request.result;
        for (const key of keys) {
          store.delete(key);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Clear all cached records (for database resets)
 */
export async function clearAllOfflineCache(): Promise<void> {
  memoryCacheStore.clear();
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      tx.objectStore(STORE_RECORDS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ============================================================================
// STORE 2: BOUNDED, PERSISTENT OFFLINE WRITE QUEUE
// ============================================================================

export interface EnqueueMutationOptions<T = any> {
  userId: string;
  resource: string;
  recordId: string;
  opType: OfflineOpType;
  payload: T;
  baseVersion?: number;
  idempotencyKey?: string;
}

/**
 * Enqueue a mutation when operating offline or during connection loss.
 */
export async function enqueueOfflineMutation<T>(
  opts: EnqueueMutationOptions<T>
): Promise<OfflineMutation<T>> {
  const opId = generateOfflineId('mut');
  const idempotencyKey = opts.idempotencyKey || generateOfflineId('idem');
  const mutation: OfflineMutation<T> = {
    opId,
    idempotencyKey,
    userId: opts.userId,
    resource: opts.resource,
    recordId: opts.recordId,
    opType: opts.opType,
    payload: opts.payload,
    baseVersion: opts.baseVersion ?? 1,
    clientTimestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  const db = await initOfflineDb();
  if (!db) {
    memoryQueueStore.set(opId, mutation);
    return mutation;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      store.put(mutation);

      tx.oncomplete = () => resolve(mutation);
      tx.onerror = () => {
        memoryQueueStore.set(opId, mutation);
        resolve(mutation);
      };
    } catch (err) {
      memoryQueueStore.set(opId, mutation);
      resolve(mutation);
    }
  });
}

/**
 * Get all pending mutations for a specific user (or all users if omitted).
 */
export async function getPendingMutations(userId?: string): Promise<OfflineMutation[]> {
  const db = await initOfflineDb();

  if (!db) {
    const items = Array.from(memoryQueueStore.values())
      .filter((m) => m.status === 'pending' || m.status === 'failed')
      .filter((m) => !userId || m.userId === userId)
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    return items;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = (request.result as OfflineMutation[]) || [];
        results = results
          .filter((m) => m.status === 'pending' || m.status === 'failed')
          .filter((m) => !userId || m.userId === userId)
          .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
        resolve(results);
      };

      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Get all mutations regardless of status.
 */
export async function getAllMutations(userId?: string): Promise<OfflineMutation[]> {
  const db = await initOfflineDb();

  if (!db) {
    const items = Array.from(memoryQueueStore.values())
      .filter((m) => !userId || m.userId === userId)
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    return items;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = (request.result as OfflineMutation[]) || [];
        if (userId) {
          results = results.filter((m) => m.userId === userId);
        }
        results.sort((a, b) => a.clientTimestamp - b.clientTimestamp);
        resolve(results);
      };

      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Update mutation status (e.g. syncing, failed, conflict)
 */
export async function updateMutationStatus(
  opId: string,
  status: OfflineOpStatus,
  options?: { error?: string; retryCount?: number; conflictDetails?: any }
): Promise<void> {
  const db = await initOfflineDb();

  if (!db) {
    const item = memoryQueueStore.get(opId);
    if (item) {
      item.status = status;
      if (options?.error !== undefined) item.lastError = options.error;
      if (options?.retryCount !== undefined) item.retryCount = options.retryCount;
      if (options?.conflictDetails !== undefined) item.conflictDetails = options.conflictDetails;
    }
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const getReq = store.get(opId);

      getReq.onsuccess = () => {
        const item = getReq.result as OfflineMutation | undefined;
        if (item) {
          item.status = status;
          if (options?.error !== undefined) item.lastError = options.error;
          if (options?.retryCount !== undefined) item.retryCount = options.retryCount;
          if (options?.conflictDetails !== undefined) item.conflictDetails = options.conflictDetails;
          store.put(item);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Remove a successfully synchronized mutation from the queue.
 */
export async function dequeueMutation(opId: string): Promise<void> {
  memoryQueueStore.delete(opId);
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      store.delete(opId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Clear all queue items for a user.
 */
export async function clearUserQueue(userId: string): Promise<void> {
  for (const [id, item] of memoryQueueStore.entries()) {
    if (item.userId === userId) {
      memoryQueueStore.delete(id);
    }
  }

  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_QUEUE);
      const index = store.index('by_user');
      const request = index.getAllKeys(IDBKeyRange.only(userId));

      request.onsuccess = () => {
        const keys = request.result;
        for (const key of keys) {
          store.delete(key);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Complete reset of both stores (for testing and factory resets)
 */
export async function resetOfflineStorage(): Promise<void> {
  memoryCacheStore.clear();
  memoryQueueStore.clear();

  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_RECORDS, STORE_QUEUE], 'readwrite');
      tx.objectStore(STORE_RECORDS).clear();
      tx.objectStore(STORE_QUEUE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
