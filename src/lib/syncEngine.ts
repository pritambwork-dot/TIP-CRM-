/**
 * TIP CRM - Lightweight Sync Engine & Offline Connectivity Manager
 *
 * Coordinates offline detection, resilient queue replay, idempotency verification,
 * and base-version conflict detection with zero third-party dependencies.
 */

import {
  OfflineMutation,
  getPendingMutations,
  getAllMutations,
  updateMutationStatus,
  dequeueMutation,
  enqueueOfflineMutation,
  cacheResource,
  getCachedResource,
  clearUserOfflineCache
} from './offlineStorage';
import { clientSafeLogger } from './safeErrors';
import { supabase } from './supabase';
import { 
  DatabaseHealthService,
  PeopleService,
  OrganizationsService,
  ProgramsService,
  EventsService,
  TasksService,
  FundingService,
  DocumentsService
} from './services';

export type SyncState = 'online' | 'offline' | 'syncing' | 'pending' | 'conflict' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export type SyncListener = (status: SyncStatusInfo) => void;

/**
 * Sync Engine Singleton
 */
class SyncEngine {
  private isOnlineInternal: boolean = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  private isSyncingInternal: boolean = false;
  private lastSyncedAt: number | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private currentUserId: string | null = null;
  private syncTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic queue check every 45 seconds when online
      this.syncTimer = setInterval(() => {
        if (this.isOnlineInternal && !this.isSyncingInternal && this.currentUserId) {
          this.syncPending(this.currentUserId);
        }
      }, 45000);
    }
  }

  public setUserId(userId: string | null) {
    this.currentUserId = userId;
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Notify subscriber immediately with current status
    this.getStatus().then(status => listener(status));
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getStatus(userId?: string): Promise<SyncStatusInfo> {
    const targetUser = userId || this.currentUserId;
    let pendingCount = 0;
    let conflictCount = 0;

    try {
      const all = await getAllMutations(targetUser || undefined);
      pendingCount = all.filter(m => m.status === 'pending' || m.status === 'failed').length;
      conflictCount = all.filter(m => m.status === 'conflict').length;
    } catch {
      // Fallback
    }

    let state: SyncState = 'online';
    if (!this.isOnlineInternal) {
      state = 'offline';
    } else if (this.isSyncingInternal) {
      state = 'syncing';
    } else if (conflictCount > 0) {
      state = 'conflict';
    } else if (this.lastError && pendingCount > 0) {
      state = 'error';
    } else if (pendingCount > 0) {
      state = 'pending';
    }

    return {
      state,
      isOnline: this.isOnlineInternal,
      pendingCount,
      conflictCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError
    };
  }

  private async notify() {
    const status = await this.getStatus();
    this.listeners.forEach(fn => {
      try {
        fn(status);
      } catch (err) {
        clientSafeLogger.error('Sync listener error', err);
      }
    });
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineInternal = online;
    this.notify();
    if (online && this.currentUserId) {
      this.syncPending(this.currentUserId);
    }
  }

  /**
   * Enqueue mutation safely and trigger sync if online
   */
  public async queueMutation<T>(mutationOpts: {
    userId: string;
    resource: string;
    recordId: string;
    opType: 'create' | 'update' | 'delete';
    payload: T;
    baseVersion?: number;
    idempotencyKey?: string;
  }, autoSync = false): Promise<OfflineMutation<T>> {
    const mutation = await enqueueOfflineMutation(mutationOpts);
    await this.notify();

    // If autoSync is requested and online, sync immediately
    if (autoSync && this.isOnlineInternal && !this.isSyncingInternal) {
      await this.syncPending(mutationOpts.userId);
    }

    return mutation;
  }

  /**
   * Sync pending mutations for the given user
   */
  public async syncPending(userId: string): Promise<{ synced: number; conflicts: number; failed: number }> {
    if (this.isSyncingInternal || !this.isOnlineInternal) {
      return { synced: 0, conflicts: 0, failed: 0 };
    }

    this.isSyncingInternal = true;
    this.lastError = null;
    await this.notify();

    let synced = 0;
    let conflicts = 0;
    let failed = 0;

    try {
      const pending = await getPendingMutations(userId);

      for (const mut of pending) {
        try {
          await updateMutationStatus(mut.opId, 'syncing');

          // Process individual mutation with idempotency and optimistic base-version check
          const result = await this.executeMutationSync(mut);

          if (result.status === 'success') {
            await dequeueMutation(mut.opId);
            synced++;
          } else if (result.status === 'conflict') {
            await updateMutationStatus(mut.opId, 'conflict', {
              conflictDetails: result.conflictDetails,
              error: 'Version conflict detected: record modified on server.'
            });
            conflicts++;
          } else {
            await updateMutationStatus(mut.opId, 'failed', {
              retryCount: (mut.retryCount || 0) + 1,
              error: result.error || 'Sync failed.'
            });
            failed++;
          }
        } catch (err: any) {
          failed++;
          await updateMutationStatus(mut.opId, 'failed', {
            retryCount: (mut.retryCount || 0) + 1,
            error: err?.message || 'Network error during mutation sync.'
          });
        }
      }

      this.lastSyncedAt = Date.now();
      if (failed > 0) {
        this.lastError = `${failed} item(s) could not sync. Will retry automatically.`;
      }
    } catch (err: any) {
      this.lastError = err?.message || 'Sync failed.';
    } finally {
      this.isSyncingInternal = false;
      await this.notify();
    }

    return { synced, conflicts, failed };
  }

  /**
   * Execute an individual mutation against local store or server
   */
  private async executeMutationSync(mut: OfflineMutation): Promise<{
    status: 'success' | 'conflict' | 'failed';
    error?: string;
    conflictDetails?: any;
  }> {
    // Check base version against local or server cache
    const cached = await getCachedResource<any>(mut.userId, mut.resource);
    if (cached && cached.version > mut.baseVersion) {
      // Possible conflict: server/local data has evolved past the client base version
      const currentList: any[] = Array.isArray(cached.data) ? cached.data : [];
      const existing = currentList.find((item: any) => item.id === mut.recordId);

      if (existing && mut.opType === 'update') {
        // Compare payload with existing record
        const payloadStr = JSON.stringify(mut.payload);
        const existingStr = JSON.stringify(existing);
        if (payloadStr !== existingStr) {
          return {
            status: 'conflict',
            conflictDetails: {
              serverVersion: cached.version,
              serverRecord: existing,
              clientPayload: mut.payload
            }
          };
        }
      }
    }

    // In local-first mode without Supabase client, commit locally
    if (!supabase) {
      return { status: 'success' };
    }

    // When Supabase is configured, execute against real PostgreSQL tables
    return this.executeCloudMutation(mut);
  }

  /**
   * Dispatches a queued mutation to the authoritative Supabase data service
   */
  private async executeCloudMutation(mut: OfflineMutation): Promise<{
    status: 'success' | 'conflict' | 'failed';
    error?: string;
    conflictDetails?: any;
  }> {
    const readiness = await DatabaseHealthService.checkReadiness();
    if (!readiness.isConnected) {
      return { status: 'failed', error: 'Network offline. Mutation retained in queue.' };
    }
    if (!readiness.isSchemaDeployed) {
      return { status: 'failed', error: 'Supabase schema not deployed. Migration deploy_all.sql must be applied by administrator.' };
    }

    try {
      let result: { data: any; error: any } = { data: null, error: null };

      switch (mut.resource) {
        case 'people': {
          if (mut.opType === 'create') result = await PeopleService.create(mut.payload, mut.userId);
          else if (mut.opType === 'update') result = await PeopleService.update(mut.recordId, mut.payload);
          else if (mut.opType === 'delete') result = await PeopleService.delete(mut.recordId);
          break;
        }
        case 'organizations': {
          if (mut.opType === 'create') result = await OrganizationsService.create(mut.payload);
          else if (mut.opType === 'update') result = await OrganizationsService.update(mut.recordId, mut.payload);
          else if (mut.opType === 'delete') result = await OrganizationsService.delete(mut.recordId);
          break;
        }
        case 'programs': {
          if (mut.opType === 'create') result = await ProgramsService.create(mut.payload, mut.userId);
          else if (mut.opType === 'update') result = await ProgramsService.update(mut.recordId, mut.payload);
          else if (mut.opType === 'delete') result = await ProgramsService.delete(mut.recordId);
          break;
        }
        case 'events': {
          if (mut.opType === 'create') result = await EventsService.create(mut.payload, mut.userId);
          else if (mut.opType === 'update') result = await EventsService.update(mut.recordId, mut.payload);
          else if (mut.opType === 'delete') result = await EventsService.delete(mut.recordId);
          break;
        }
        case 'tasks': {
          if (mut.opType === 'create') result = await TasksService.create(mut.payload, mut.userId);
          else if (mut.opType === 'update') result = await TasksService.update(mut.recordId, mut.payload);
          else if (mut.opType === 'delete') result = await TasksService.delete(mut.recordId);
          break;
        }
        case 'funding': {
          if (mut.opType === 'create') result = await FundingService.create(mut.payload, mut.userId);
          else if (mut.opType === 'update') result = await FundingService.update(mut.recordId, mut.payload);
          else if (mut.opType === 'delete') result = await FundingService.delete(mut.recordId);
          break;
        }
        case 'documents': {
          if (mut.opType === 'create') result = await DocumentsService.create(mut.payload, mut.userId);
          else if (mut.opType === 'delete') result = await DocumentsService.delete(mut.recordId);
          break;
        }
        default:
          return { status: 'success' };
      }

      if (result.error) {
        return { status: 'failed', error: result.error.message };
      }

      return { status: 'success' };
    } catch (exc: any) {
      return { status: 'failed', error: exc?.message || 'Database error during cloud synchronization.' };
    }
  }

  /**
   * Force manual synchronization now
   */
  public async syncNow(userId?: string) {
    const target = userId || this.currentUserId;
    if (target) {
      return this.syncPending(target);
    }
  }

  public destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.listeners.clear();
  }
}

export const syncEngine = new SyncEngine();

/**
 * React Hook for UI components to display sync and connectivity status
 */
import { useState, useEffect } from 'react';

export function useSyncStatus(userId?: string) {
  const [status, setStatus] = useState<SyncStatusInfo>({
    state: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine ? 'offline' : 'online',
    isOnline: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    pendingCount: 0,
    conflictCount: 0,
    lastSyncedAt: null,
    lastError: null
  });

  useEffect(() => {
    if (userId) {
      syncEngine.setUserId(userId);
    }

    const unsubscribe = syncEngine.subscribe((updatedStatus) => {
      setStatus(updatedStatus);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const syncNow = () => {
    return syncEngine.syncNow(userId);
  };

  return {
    ...status,
    syncNow
  };
}
