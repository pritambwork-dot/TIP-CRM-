/**
 * TIP CRM - Funding & Donors Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Funding Records.
 * Strictly adheres to RLS: Accessible to Super Admins and Staff with funding_scope in ('ALL', 'VIEW').
 * Hidden from volunteers.
 */

import { supabase } from '../supabase';
import { FundingRecord, FundingType, FundingStatus } from '../../types';
import { ServiceResult, ok, err, toValidUuid, toIsoDate, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbFundingRow {
  id: string;
  donor_or_funder: string;
  organization_id: string | null;
  program_id: string | null;
  amount_cad: number;
  date: string;
  funding_type: string;
  status: string;
  report_due_date: string | null;
  fiscal_year: string | null;
  grant_deliverable_note: string | null;
  notes: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string | null;
  organizations?: any;
  programs?: any;
}

export function mapDbToFunding(row: any): FundingRecord {
  const orgName = Array.isArray(row.organizations) ? row.organizations[0]?.name : row.organizations?.name;
  const programName = Array.isArray(row.programs) ? row.programs[0]?.name : row.programs?.name;

  return {
    id: row.id,
    donorOrFunder: row.donor_or_funder,
    funderName: row.donor_or_funder,
    organizationId: row.organization_id || undefined,
    organizationName: orgName || undefined,
    programId: row.program_id || undefined,
    relatedProgramId: row.program_id || undefined,
    relatedProgramName: programName || undefined,
    amountCad: Number(row.amount_cad) || 0,
    date: row.date || '',
    fundingType: (row.funding_type as FundingType) || 'Grant',
    type: (row.funding_type as FundingType) || 'Grant',
    status: (row.status as FundingStatus) || 'Received',
    reportDueDate: row.report_due_date || undefined,
    reportingDeadline: row.report_due_date || undefined,
    fiscalYear: row.fiscal_year || undefined,
    grantDeliverableNote: row.grant_deliverable_note || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  };
}

export function mapFundingToDb(funding: Partial<FundingRecord>, creatorId?: string): Record<string, any> {
  const row: Record<string, any> = {};

  if (funding.donorOrFunder !== undefined || funding.funderName !== undefined) {
    row.donor_or_funder = (funding.donorOrFunder || funding.funderName || '').trim();
  }
  if (funding.organizationId !== undefined) {
    row.organization_id = isUuid(funding.organizationId) ? funding.organizationId : null;
  }
  if (funding.programId !== undefined || funding.relatedProgramId !== undefined) {
    const pId = funding.programId || funding.relatedProgramId;
    row.program_id = isUuid(pId) ? pId : null;
  }
  if (funding.amountCad !== undefined) row.amount_cad = Number(funding.amountCad) || 0;
  if (funding.date !== undefined) row.date = toIsoDate(funding.date);
  if (funding.fundingType !== undefined || funding.type !== undefined) {
    row.funding_type = funding.fundingType || funding.type || 'Grant';
  }
  if (funding.status !== undefined) row.status = funding.status;
  if (funding.reportDueDate !== undefined || funding.reportingDeadline !== undefined) {
    const due = funding.reportDueDate || funding.reportingDeadline;
    row.report_due_date = due ? toIsoDate(due) : null;
  }
  if (funding.fiscalYear !== undefined) row.fiscal_year = funding.fiscalYear?.trim() || null;
  if (funding.grantDeliverableNote !== undefined) row.grant_deliverable_note = funding.grantDeliverableNote || null;
  if (funding.notes !== undefined) row.notes = funding.notes || null;
  if (creatorId && isUuid(creatorId)) row.created_by = creatorId;

  return row;
}

export class FundingService {
  static async getAll(): Promise<ServiceResult<FundingRecord[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('funding_records')
        .select(`
          id,
          donor_or_funder,
          organization_id,
          program_id,
          amount_cad,
          date,
          funding_type,
          status,
          report_due_date,
          fiscal_year,
          grant_deliverable_note,
          notes,
          created_at,
          updated_at,
          organizations ( name ),
          programs ( name )
        `)
        .order('date', { ascending: false });

      if (error) {
        clientSafeLogger.warn('FundingService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToFunding));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching funding records', 'NETWORK_ERROR', 0);
    }
  }

  static async getById(id: string): Promise<ServiceResult<FundingRecord>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('funding_records')
        .select(`
          id,
          donor_or_funder,
          organization_id,
          program_id,
          amount_cad,
          date,
          funding_type,
          status,
          report_due_date,
          fiscal_year,
          grant_deliverable_note,
          notes,
          created_at,
          updated_at,
          organizations ( name ),
          programs ( name )
        `)
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToFunding(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch funding record', 'NETWORK_ERROR', 0);
    }
  }

  static async create(funding: Omit<FundingRecord, 'id' | 'createdAt'>, creatorId?: string): Promise<ServiceResult<FundingRecord>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    const donor = (funding.donorOrFunder || funding.funderName || '').trim();
    if (!donor) return err('Donor / Funder name is required', 'VALIDATION_ERROR', 400);
    if (funding.amountCad === undefined || Number(funding.amountCad) <= 0) {
      return err('A positive funding amount is required', 'VALIDATION_ERROR', 400);
    }

    try {
      const dbPayload = mapFundingToDb(funding, creatorId);
      dbPayload.id = toValidUuid();

      const { data, error, status } = await supabase
        .from('funding_records')
        .insert([dbPayload])
        .select(`
          id,
          donor_or_funder,
          organization_id,
          program_id,
          amount_cad,
          date,
          funding_type,
          status,
          report_due_date,
          fiscal_year,
          grant_deliverable_note,
          notes,
          created_at,
          updated_at,
          organizations ( name ),
          programs ( name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToFunding(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error creating funding record', 'NETWORK_ERROR', 0);
    }
  }

  static async update(id: string, updates: Partial<FundingRecord>): Promise<ServiceResult<FundingRecord>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapFundingToDb(updates);
      dbPayload.updated_at = new Date().toISOString();

      const { data, error, status } = await supabase
        .from('funding_records')
        .update(dbPayload)
        .eq('id', id)
        .select(`
          id,
          donor_or_funder,
          organization_id,
          program_id,
          amount_cad,
          date,
          funding_type,
          status,
          report_due_date,
          fiscal_year,
          grant_deliverable_note,
          notes,
          created_at,
          updated_at,
          organizations ( name ),
          programs ( name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToFunding(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating funding record', 'NETWORK_ERROR', 0);
    }
  }

  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('funding_records')
        .delete()
        .eq('id', id);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting funding record', 'NETWORK_ERROR', 0);
    }
  }
}
