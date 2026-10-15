/**
 * TIP CRM - Users & Role Management Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Users, User Roles,
 * and Account Approvals.
 */

import { supabase } from '../supabase';
import { UserProfile, RoleId, UserAccountStatus, UserDataScope } from '../../types';
import { ServiceResult, ok, err, toValidUuid, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbUserRow {
  id: string;
  auth_user_id: string | null;
  organization_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  is_active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  requested_at: string | null;
  people_scope: string | null;
  programs_scope: string | null;
  events_scope: string | null;
  funding_scope: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string | null;
  user_roles?: Array<{ role_id: string }>;
  user_program_access?: Array<{ program_id: string }>;
  user_event_access?: Array<{ event_id: string }>;
}

export function mapDbToUserProfile(row: DbUserRow): UserProfile {
  const roleIds = Array.isArray(row.user_roles) && row.user_roles.length > 0
    ? row.user_roles.map(r => r.role_id as RoleId)
    : [((row.status === 'approved' ? 'staff_member' : 'volunteer') as RoleId)];

  const primaryRoleId = roleIds[0] || 'staff_member';

  const assignedProgramIds = Array.isArray(row.user_program_access)
    ? row.user_program_access.map(p => p.program_id)
    : [];

  const assignedEventIds = Array.isArray(row.user_event_access)
    ? row.user_event_access.map(e => e.event_id)
    : [];

  const dataScope: UserDataScope = {
    people: (row.people_scope as any) || 'ASSIGNED',
    programs: (row.programs_scope as any) || 'ASSIGNED',
    events: (row.events_scope as any) || 'ASSIGNED',
    funding: (row.funding_scope as any) || 'NONE'
  };

  const name = row.full_name || 'Staff User';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0].toUpperCase())
    .slice(0, 2)
    .join('') || 'SU';

  return {
    id: row.id,
    authUserId: row.auth_user_id || undefined,
    organizationId: row.organization_id || 'org-tip',
    name,
    email: row.email,
    phone: row.phone || undefined,
    roleId: primaryRoleId,
    role: primaryRoleId === 'volunteer' ? 'volunteer' : 'staff',
    assignedRoleIds: roleIds,
    activeRoleId: primaryRoleId,
    title: row.title || (primaryRoleId === 'super_admin' ? 'Super Administrator' : 'Staff Member'),
    avatarInitials: initials,
    status: (row.status as UserAccountStatus) || 'pending',
    isActive: Boolean(row.is_active),
    emailVerified: true,
    adminApproved: row.status === 'approved',
    assignedProgramIds,
    assignedEventIds,
    dataScope,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    lastLogin: row.last_login_at || undefined
  };
}

export class UsersService {
  /**
   * Fetch all user profiles within the current user's organization
   */
  static async getAll(): Promise<ServiceResult<UserProfile[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          organization_id,
          full_name,
          email,
          avatar_url,
          phone,
          title,
          status,
          is_active,
          approved_by,
          approved_at,
          rejection_reason,
          requested_at,
          people_scope,
          programs_scope,
          events_scope,
          funding_scope,
          last_login_at,
          created_at,
          updated_at,
          user_roles ( role_id ),
          user_program_access ( program_id ),
          user_event_access ( event_id )
        `)
        .order('full_name', { ascending: true });

      if (error) {
        clientSafeLogger.warn('UsersService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToUserProfile));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching users', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Fetch a user profile by internal UUID
   */
  static async getById(id: string): Promise<ServiceResult<UserProfile>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          organization_id,
          full_name,
          email,
          avatar_url,
          phone,
          title,
          status,
          is_active,
          approved_by,
          approved_at,
          rejection_reason,
          requested_at,
          people_scope,
          programs_scope,
          events_scope,
          funding_scope,
          last_login_at,
          created_at,
          updated_at,
          user_roles ( role_id ),
          user_program_access ( program_id ),
          user_event_access ( event_id )
        `)
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToUserProfile(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch user', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Fetch a user profile by auth_user_id (Supabase Auth UID)
   */
  static async getByAuthUserId(authUserId: string): Promise<ServiceResult<UserProfile>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          organization_id,
          full_name,
          email,
          avatar_url,
          phone,
          title,
          status,
          is_active,
          approved_by,
          approved_at,
          rejection_reason,
          requested_at,
          people_scope,
          programs_scope,
          events_scope,
          funding_scope,
          last_login_at,
          created_at,
          updated_at,
          user_roles ( role_id ),
          user_program_access ( program_id ),
          user_event_access ( event_id )
        `)
        .eq('auth_user_id', authUserId)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToUserProfile(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch user by auth ID', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Update user status (Requires Super Admin under RLS)
   */
  static async updateUserStatus(
    id: string, 
    status: UserAccountStatus, 
    isActive: boolean
  ): Promise<ServiceResult<boolean>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status: httpStatus } = await supabase
        .from('users')
        .update({
          status,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) return err(error.message, error.code, httpStatus);
      return ok(true);
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating user status', 'NETWORK_ERROR', 0);
    }
  }
}
