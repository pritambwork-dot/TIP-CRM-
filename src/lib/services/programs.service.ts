/**
 * TIP CRM - Programs Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Programs domain.
 * Supports program members, participants, status tracking, and budgeting.
 */

import { supabase } from '../supabase';
import { Program, ProgramStatus } from '../../types';
import { ServiceResult, ok, err, toValidUuid, toIsoDate, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbProgramRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
  budget_cad: number | null;
  outcomes: string | null;
  created_at: string;
  updated_at: string | null;
  users?: { full_name: string; email: string } | null;
  program_participants?: Array<{ person_id: string }>;
}

export function mapDbToProgram(row: any): Program {
  const participantIds = Array.isArray(row.program_participants)
    ? row.program_participants.map((p: any) => p.person_id)
    : [];

  const userObj = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    status: (row.status as ProgramStatus) || 'Active',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    ownerName: userObj?.full_name || 'Unassigned',
    ownerEmail: userObj?.email || undefined,
    participantIds,
    partnerIds: [],
    progressPercent: 50,
    focusAreas: [],
    budgetCad: row.budget_cad ? Number(row.budget_cad) : 0,
    outcomes: row.outcomes || undefined,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  };
}

export function mapProgramToDb(prog: Partial<Program>, ownerId?: string): Record<string, any> {
  const row: Record<string, any> = {};

  if (prog.name !== undefined) row.name = prog.name.trim();
  if (prog.description !== undefined) row.description = prog.description || null;
  if (prog.status !== undefined) row.status = prog.status;
  if (prog.startDate !== undefined) row.start_date = prog.startDate ? toIsoDate(prog.startDate) : null;
  if (prog.endDate !== undefined) row.end_date = prog.endDate ? toIsoDate(prog.endDate) : null;
  if (prog.budgetCad !== undefined) row.budget_cad = Number(prog.budgetCad) || 0;
  if (prog.outcomes !== undefined) row.outcomes = prog.outcomes || null;
  if (ownerId && isUuid(ownerId)) row.owner_id = ownerId;

  return row;
}

export class ProgramsService {
  static async getAll(): Promise<ServiceResult<Program[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          owner_id,
          budget_cad,
          outcomes,
          created_at,
          updated_at,
          users ( full_name, email ),
          program_participants ( person_id )
        `)
        .order('name', { ascending: true });

      if (error) {
        clientSafeLogger.warn('ProgramsService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToProgram));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching programs', 'NETWORK_ERROR', 0);
    }
  }

  static async getById(id: string): Promise<ServiceResult<Program>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          owner_id,
          budget_cad,
          outcomes,
          created_at,
          updated_at,
          users ( full_name, email ),
          program_participants ( person_id )
        `)
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToProgram(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch program', 'NETWORK_ERROR', 0);
    }
  }

  static async create(prog: Omit<Program, 'id' | 'createdAt'>, ownerId?: string): Promise<ServiceResult<Program>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!prog.name || prog.name.trim().length === 0) return err('Program name is required', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapProgramToDb(prog, ownerId);
      dbPayload.id = toValidUuid();

      const { data, error, status } = await supabase
        .from('programs')
        .insert([dbPayload])
        .select(`
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          owner_id,
          budget_cad,
          outcomes,
          created_at,
          updated_at,
          users ( full_name, email )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToProgram(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error creating program', 'NETWORK_ERROR', 0);
    }
  }

  static async update(id: string, updates: Partial<Program>): Promise<ServiceResult<Program>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapProgramToDb(updates);
      dbPayload.updated_at = new Date().toISOString();

      const { data, error, status } = await supabase
        .from('programs')
        .update(dbPayload)
        .eq('id', id)
        .select(`
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          owner_id,
          budget_cad,
          outcomes,
          created_at,
          updated_at,
          users ( full_name, email )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToProgram(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating program', 'NETWORK_ERROR', 0);
    }
  }

  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting program', 'NETWORK_ERROR', 0);
    }
  }
}
