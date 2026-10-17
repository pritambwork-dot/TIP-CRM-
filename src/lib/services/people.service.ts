/**
 * TIP CRM - People (Contacts Directory) Service
 *
 * Implements real asynchronous PostgreSQL / Supabase operations for People entity.
 * Handles schema mapping (camelCase <-> snake_case), UUID validation,
 * RLS authorization handling, and resilient error recovery.
 */

import { supabase } from '../supabase';
import { Person, RelationshipType } from '../../types';
import { ServiceResult, ok, err, toValidUuid, toIsoDate, toIsoTimestamp, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbPersonRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role_title?: string | null;
  organization_id?: string | null;
  relationship_types?: string[] | null;
  city?: string | null;
  province?: string | null;
  notes?: string | null;
  mailchimp_status?: string | null;
  last_interaction_date?: string | null;
  next_follow_up_date?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string | null;
  organizations?: any;
}

export function mapDbToPerson(row: any): Person {
  const orgName = Array.isArray(row.organizations) 
    ? row.organizations[0]?.name 
    : row.organizations?.name;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    role: row.role_title || undefined,
    organizationId: row.organization_id || undefined,
    organizationName: orgName || undefined,
    relationshipTypes: (row.relationship_types as RelationshipType[]) || ['Participant'],
    interests: [],
    programIds: [],
    eventIds: [],
    city: row.city || undefined,
    province: row.province || undefined,
    notes: row.notes || undefined,
    mailchimpStatus: (row.mailchimp_status as any) || 'pending',
    lastInteractionDate: row.last_interaction_date || undefined,
    nextFollowUpDate: row.next_follow_up_date || undefined,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  };
}

export function mapPersonToDb(person: Partial<Person>, actorUserId?: string): Record<string, any> {
  const row: Record<string, any> = {};

  if (person.name !== undefined) row.name = person.name.trim();
  if (person.email !== undefined) row.email = person.email.trim().toLowerCase();
  if (person.phone !== undefined) row.phone = person.phone?.trim() || null;
  if (person.role !== undefined) row.role_title = person.role?.trim() || null;
  if (person.organizationId !== undefined) {
    row.organization_id = isUuid(person.organizationId) ? person.organizationId : null;
  }
  if (person.relationshipTypes !== undefined) {
    row.relationship_types = person.relationshipTypes.length > 0 ? person.relationshipTypes : ['Participant'];
  }
  if (person.city !== undefined) row.city = person.city?.trim() || null;
  if (person.province !== undefined) row.province = person.province?.trim() || null;
  if (person.notes !== undefined) row.notes = person.notes || null;
  if (person.mailchimpStatus !== undefined) row.mailchimp_status = person.mailchimpStatus;
  if (person.lastInteractionDate !== undefined) {
    row.last_interaction_date = person.lastInteractionDate ? toIsoDate(person.lastInteractionDate) : null;
  }
  if (person.nextFollowUpDate !== undefined) {
    row.next_follow_up_date = person.nextFollowUpDate ? toIsoDate(person.nextFollowUpDate) : null;
  }
  if (actorUserId && isUuid(actorUserId)) {
    row.created_by = actorUserId;
  }

  return row;
}

export class PeopleService {
  /**
   * Fetch all people records visible under current user RLS scope
   */
  static async getAll(): Promise<ServiceResult<Person[]>> {
    if (!supabase) {
      return err('Supabase client is not configured', 'NOT_CONFIGURED', 503);
    }

    try {
      const { data, error, status } = await supabase
        .from('people')
        .select(`
          id,
          name,
          email,
          phone,
          role_title,
          organization_id,
          relationship_types,
          city,
          province,
          notes,
          mailchimp_status,
          last_interaction_date,
          next_follow_up_date,
          created_at,
          updated_at,
          organizations ( name )
        `)
        .order('name', { ascending: true });

      if (error) {
        clientSafeLogger.warn('PeopleService.getAll query error:', error.message);
        return err(error.message, error.code, status);
      }

      const people = (data || []).map(mapDbToPerson);
      return ok(people);
    } catch (exc: any) {
      clientSafeLogger.error('PeopleService.getAll exception:', exc);
      return err(exc?.message || 'Network failure while fetching contacts', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Fetch a single person by ID
   */
  static async getById(id: string): Promise<ServiceResult<Person>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('people')
        .select(`
          id,
          name,
          email,
          phone,
          role_title,
          organization_id,
          relationship_types,
          city,
          province,
          notes,
          mailchimp_status,
          last_interaction_date,
          next_follow_up_date,
          created_at,
          updated_at,
          organizations ( name )
        `)
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToPerson(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch person', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Insert a new person record
   */
  static async create(person: Omit<Person, 'id' | 'createdAt'>, actorUserId?: string): Promise<ServiceResult<Person>> {
    // Validation
    if (!person.name || person.name.trim().length === 0) {
      return err('Contact name is required', 'VALIDATION_ERROR', 400);
    }
    if (!person.email || !person.email.includes('@')) {
      return err('Valid email address is required', 'VALIDATION_ERROR', 400);
    }

    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const dbPayload = mapPersonToDb(person, actorUserId);
      dbPayload.id = toValidUuid(); // Generate explicit RFC4122 v4 UUID

      const { data, error, status } = await supabase
        .from('people')
        .insert([dbPayload])
        .select(`
          id,
          name,
          email,
          phone,
          role_title,
          organization_id,
          relationship_types,
          city,
          province,
          notes,
          mailchimp_status,
          last_interaction_date,
          next_follow_up_date,
          created_at,
          updated_at,
          organizations ( name )
        `)
        .single();

      if (error) {
        clientSafeLogger.error('PeopleService.create error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok(mapDbToPerson(data as any));
    } catch (exc: any) {
      clientSafeLogger.error('PeopleService.create exception:', exc);
      return err(exc?.message || 'Network error inserting contact', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Update an existing person record
   */
  static async update(id: string, updates: Partial<Person>): Promise<ServiceResult<Person>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapPersonToDb(updates);
      dbPayload.updated_at = new Date().toISOString();

      const { data, error, status } = await supabase
        .from('people')
        .update(dbPayload)
        .eq('id', id)
        .select(`
          id,
          name,
          email,
          phone,
          role_title,
          organization_id,
          relationship_types,
          city,
          province,
          notes,
          mailchimp_status,
          last_interaction_date,
          next_follow_up_date,
          created_at,
          updated_at,
          organizations ( name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToPerson(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating contact', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Delete a person record (Requires Staff Manager or higher under RLS)
   */
  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting contact', 'NETWORK_ERROR', 0);
    }
  }
}
