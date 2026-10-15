/**
 * TIP CRM - Audit Logs Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Audit Logging.
 * Enforces immutability: append-only; zero update or delete APIs exist.
 */

import { supabase } from '../supabase';
import { AuditLogItem } from '../../types';
import { ServiceResult, ok, err, toValidUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbAuditLogRow {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  entity_name: string | null;
  outcome: string;
  description: string;
  correlation_id: string | null;
  metadata: any | null;
  ip_address: string | null;
  timestamp: string;
}

export function mapDbToAuditLog(row: DbAuditLogRow): AuditLogItem {
  return {
    id: row.id,
    action: row.action,
    entityType: row.resource_type,
    entityName: row.entity_name || '',
    userName: row.actor_name,
    timestamp: row.timestamp ? row.timestamp.replace('T', ' ').substring(0, 16) : new Date().toISOString(),
    details: row.description
  };
}

export class AuditLogsService {
  /**
   * Fetch recent audit logs (Requires Super Admin or Staff Manager under RLS)
   */
  static async getRecent(limit = 100): Promise<ServiceResult<AuditLogItem[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        clientSafeLogger.warn('AuditLogsService.getRecent error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToAuditLog));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching audit logs', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Append an audit event to the database
   */
  static async log(entry: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    entityName?: string;
    outcome?: 'SUCCESS' | 'FAILURE';
    description: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): Promise<ServiceResult<AuditLogItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const dbPayload = {
        id: toValidUuid(),
        actor_id: entry.actorId || 'unknown',
        actor_name: entry.actorName || 'System User',
        actor_role: entry.actorRole || 'staff_member',
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        entity_name: entry.entityName || null,
        outcome: entry.outcome || 'SUCCESS',
        description: entry.description,
        correlation_id: entry.correlationId || null,
        metadata: entry.metadata || null,
        timestamp: new Date().toISOString()
      };

      const { data, error, status } = await supabase
        .from('audit_logs')
        .insert([dbPayload])
        .select('*')
        .single();

      if (error) {
        clientSafeLogger.warn('AuditLogsService.log error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok(mapDbToAuditLog(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error writing audit log', 'NETWORK_ERROR', 0);
    }
  }
}
