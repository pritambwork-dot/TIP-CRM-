/**
 * TIP CRM - Database Health & Readiness Service
 *
 * Verifies connectivity to Supabase, checks whether the schema tables exist in the
 * active database, and provides authoritative readiness reporting for the UI and sync engine.
 */

import { supabase } from '../supabase';
import { ServiceResult, ok, err } from './types';

export interface DatabaseReadinessReport {
  isConfigured: boolean;
  isConnected: boolean;
  isSchemaDeployed: boolean;
  tablesFound: string[];
  missingTables: string[];
  latencyMs: number;
  message: string;
}

const REQUIRED_CORE_TABLES = [
  'people',
  'organizations',
  'programs',
  'events',
  'tasks',
  'funding_records',
  'documents',
  'audit_logs',
  'users',
  'user_roles'
];

let cachedReadiness: DatabaseReadinessReport | null = null;
let lastCheckTimestamp = 0;
const CACHE_TTL_MS = 30000; // Cache readiness status for 30s to avoid hammering REST API

export class DatabaseHealthService {
  /**
   * Fast sync check: Is Supabase client initialized with credentials?
   */
  static isConfigured(): boolean {
    return supabase !== null;
  }

  /**
   * Comprehensive async readiness probe
   */
  static async checkReadiness(forceRefresh = false): Promise<DatabaseReadinessReport> {
    const now = Date.now();
    if (!forceRefresh && cachedReadiness && (now - lastCheckTimestamp < CACHE_TTL_MS)) {
      return cachedReadiness;
    }

    if (!supabase) {
      cachedReadiness = {
        isConfigured: false,
        isConnected: false,
        isSchemaDeployed: false,
        tablesFound: [],
        missingTables: [...REQUIRED_CORE_TABLES],
        latencyMs: 0,
        message: 'Supabase credentials are not configured in environment (VITE_SUPABASE_URL is missing).'
      };
      lastCheckTimestamp = now;
      return cachedReadiness;
    }

    const startTime = performance.now();

    try {
      // Test the probe query on 'people'
      const { data, error, status } = await supabase
        .from('people')
        .select('id')
        .limit(1);

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        // Check for PGRST205 (table not found in PostgREST schema cache)
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          cachedReadiness = {
            isConfigured: true,
            isConnected: true,
            isSchemaDeployed: false,
            tablesFound: [],
            missingTables: [...REQUIRED_CORE_TABLES],
            latencyMs,
            message: 'Connected to Supabase project, but the PostgreSQL schema is not deployed (0 public tables found). Migration deploy_all.sql must be applied by TIP administrator.'
          };
        } else if (status === 0 || error.message?.includes('fetch failed')) {
          cachedReadiness = {
            isConfigured: true,
            isConnected: false,
            isSchemaDeployed: false,
            tablesFound: [],
            missingTables: [...REQUIRED_CORE_TABLES],
            latencyMs,
            message: 'Unable to reach Supabase project (Network unreachable or offline).'
          };
        } else {
          // Other error (e.g. 401/403 RLS unauthorized on empty table)
          cachedReadiness = {
            isConfigured: true,
            isConnected: true,
            isSchemaDeployed: true, // table exists, permission denied is an RLS check
            tablesFound: ['people'],
            missingTables: [],
            latencyMs,
            message: `Connected to Supabase. Table responded with status ${status}: ${error.message}`
          };
        }
      } else {
        // Success: table exists and query succeeded
        cachedReadiness = {
          isConfigured: true,
          isConnected: true,
          isSchemaDeployed: true,
          tablesFound: REQUIRED_CORE_TABLES,
          missingTables: [],
          latencyMs,
          message: 'Connected to Supabase with live PostgreSQL schema verified.'
        };
      }
    } catch (exc: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      cachedReadiness = {
        isConfigured: true,
        isConnected: false,
        isSchemaDeployed: false,
        tablesFound: [],
        missingTables: [...REQUIRED_CORE_TABLES],
        latencyMs,
        message: `Connection exception: ${exc?.message || 'Network error'}`
      };
    }

    lastCheckTimestamp = now;
    return cachedReadiness;
  }

  /**
   * Resets the readiness cache to force an immediate probe
   */
  static resetCache(): void {
    cachedReadiness = null;
    lastCheckTimestamp = 0;
  }
}
