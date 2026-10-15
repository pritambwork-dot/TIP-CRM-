/**
 * TIP CRM - Access Requests Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for onboarding requests.
 * RLS: Unapproved users can insert and view their own request; Super Admin can review all.
 */

import { supabase } from '../supabase';
import { AccessRequest, RoleId } from '../../types';
import { ServiceResult, ok, err, toValidUuid, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbAccessRequestRow {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  provider: string;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export function mapDbToAccessRequest(row: DbAccessRequestRow): AccessRequest {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    fullName: row.full_name,
    provider: (row.provider as any) || 'google',
    requestedAt: row.requested_at,
    status: (row.status as any) || 'pending',
    notes: row.notes || undefined,
    rejectionReason: row.rejection_reason || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined
  };
}

export class AccessRequestsService {
  /**
   * Fetch all access requests (Super Admin only under RLS)
   */
  static async getAll(): Promise<ServiceResult<AccessRequest[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('access_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) {
        clientSafeLogger.warn('AccessRequestsService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToAccessRequest));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching access requests', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Submit a new access request for an authenticated user
   */
  static async submitRequest(params: {
    authUserId: string;
    email: string;
    fullName: string;
    notes?: string;
    provider?: 'google' | 'email';
  }): Promise<ServiceResult<AccessRequest>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const dbPayload = {
        id: toValidUuid(),
        auth_user_id: params.authUserId,
        email: params.email.trim().toLowerCase(),
        full_name: params.fullName.trim(),
        provider: params.provider || 'google',
        status: 'pending',
        notes: params.notes || null,
        requested_at: new Date().toISOString()
      };

      const { data, error, status } = await supabase
        .from('access_requests')
        .insert([dbPayload])
        .select('*')
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToAccessRequest(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error submitting access request', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Approve an access request (Super Admin only)
   */
  static async approve(
    requestId: string,
    reviewerId: string,
    roleId: RoleId
  ): Promise<ServiceResult<boolean>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(requestId)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_by: isUuid(reviewerId) ? reviewerId : null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) return err(error.message, error.code, status);
      return ok(true);
    } catch (exc: any) {
      return err(exc?.message || 'Network error approving access request', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Reject an access request (Super Admin only)
   */
  static async reject(
    requestId: string,
    reviewerId: string,
    reason?: string
  ): Promise<ServiceResult<boolean>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(requestId)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Access request was declined by administrator.',
          reviewed_by: isUuid(reviewerId) ? reviewerId : null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) return err(error.message, error.code, status);
      return ok(true);
    } catch (exc: any) {
      return err(exc?.message || 'Network error rejecting access request', 'NETWORK_ERROR', 0);
    }
  }
}
