/**
 * TIP CRM - Organizations Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Organizations.
 * Maps schema columns to frontend Organization models and validates input.
 */

import { supabase } from '../supabase';
import { Organization, OrgType, RelationshipType } from '../../types';
import { ServiceResult, ok, err, toValidUuid, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbOrganizationRow {
  id: string;
  name: string;
  type: string | null;
  sector: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  province: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export function mapDbToOrganization(row: DbOrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector || 'Community',
    type: (row.type as OrgType) || 'Partner',
    website: row.website || '',
    relationshipTypes: ['Partner'],
    programsInvolved: [],
    city: row.city || undefined,
    province: row.province || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  };
}

export function mapOrganizationToDb(org: Partial<Organization>): Record<string, any> {
  const row: Record<string, any> = {};

  if (org.name !== undefined) row.name = org.name.trim();
  if (org.type !== undefined) row.type = org.type;
  if (org.sector !== undefined) row.sector = org.sector.trim();
  if (org.website !== undefined) row.website = org.website.trim();
  if (org.city !== undefined) row.city = org.city.trim() || null;
  if (org.province !== undefined) row.province = org.province.trim() || null;
  if (org.notes !== undefined) row.notes = org.notes || null;

  return row;
}

export class OrganizationsService {
  static async getAll(): Promise<ServiceResult<Organization[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        clientSafeLogger.warn('OrganizationsService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToOrganization));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching organizations', 'NETWORK_ERROR', 0);
    }
  }

  static async getById(id: string): Promise<ServiceResult<Organization>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToOrganization(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch organization', 'NETWORK_ERROR', 0);
    }
  }

  static async create(org: Omit<Organization, 'id' | 'createdAt'>): Promise<ServiceResult<Organization>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    if (!org.name || org.name.trim().length === 0) {
      return err('Organization name is required', 'VALIDATION_ERROR', 400);
    }

    try {
      const dbPayload = mapOrganizationToDb(org);
      dbPayload.id = toValidUuid();

      const { data, error, status } = await supabase
        .from('organizations')
        .insert([dbPayload])
        .select('*')
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToOrganization(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error creating organization', 'NETWORK_ERROR', 0);
    }
  }

  static async update(id: string, updates: Partial<Organization>): Promise<ServiceResult<Organization>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapOrganizationToDb(updates);
      dbPayload.updated_at = new Date().toISOString();

      const { data, error, status } = await supabase
        .from('organizations')
        .update(dbPayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToOrganization(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating organization', 'NETWORK_ERROR', 0);
    }
  }

  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting organization', 'NETWORK_ERROR', 0);
    }
  }
}
