/**
 * TIP CRM - Documents Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Documents.
 * Adheres to RLS: Super Admins & Managers have full access; Staff view tier-based documents;
 * Volunteers view only non-confidential tier 'all' documents.
 */

import { supabase } from '../supabase';
import { DocumentItem } from '../../types';
import { ServiceResult, ok, err, toValidUuid, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbDocumentRow {
  id: string;
  title: string;
  type: string;
  url: string;
  related_type: string | null;
  related_id: string | null;
  description: string | null;
  added_by: string | null;
  created_at: string;
  storage_path: string | null;
  storage_bucket: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_confidential: boolean | null;
  access_tier: string | null;
  checksum: string | null;
  is_direct_upload: boolean | null;
  users?: any;
}

export function mapDbToDocument(row: any): DocumentItem {
  const userName = Array.isArray(row.users) ? row.users[0]?.full_name : row.users?.full_name;

  return {
    id: row.id,
    title: row.title,
    type: (row.type as any) || 'Cloud Link',
    url: row.url,
    relatedType: (row.related_type as any) || 'General',
    relatedId: row.related_id || undefined,
    addedBy: userName || 'Staff Member',
    addedAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    description: row.description || undefined,
    storageKey: row.storage_path || undefined,
    isCloudFile: Boolean(row.is_direct_upload),
    sizeBytes: row.file_size ? Number(row.file_size) : undefined,
    mimeType: row.mime_type || undefined
  };
}

export function mapDocumentToDb(doc: Partial<DocumentItem>, addedById?: string): Record<string, any> {
  const row: Record<string, any> = {};

  if (doc.title !== undefined) row.title = doc.title.trim();
  if (doc.type !== undefined) row.type = doc.type;
  if (doc.url !== undefined) row.url = doc.url.trim();
  if (doc.relatedType !== undefined) row.related_type = doc.relatedType;
  if (doc.relatedId !== undefined) {
    row.related_id = isUuid(doc.relatedId) ? doc.relatedId : null;
  }
  if (doc.description !== undefined) row.description = doc.description || null;
  if (doc.storageKey !== undefined) row.storage_path = doc.storageKey || null;
  if (doc.isCloudFile !== undefined) row.is_direct_upload = Boolean(doc.isCloudFile);
  if (doc.sizeBytes !== undefined) row.file_size = Number(doc.sizeBytes) || 0;
  if (doc.mimeType !== undefined) row.mime_type = doc.mimeType || null;
  if (addedById && isUuid(addedById)) row.added_by = addedById;

  return row;
}

export class DocumentsService {
  static async getAll(): Promise<ServiceResult<DocumentItem[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          type,
          url,
          related_type,
          related_id,
          description,
          added_by,
          created_at,
          storage_path,
          storage_bucket,
          file_size,
          mime_type,
          is_confidential,
          access_tier,
          checksum,
          is_direct_upload,
          users ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        clientSafeLogger.warn('DocumentsService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToDocument));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching documents', 'NETWORK_ERROR', 0);
    }
  }

  static async getById(id: string): Promise<ServiceResult<DocumentItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          type,
          url,
          related_type,
          related_id,
          description,
          added_by,
          created_at,
          storage_path,
          storage_bucket,
          file_size,
          mime_type,
          is_confidential,
          access_tier,
          checksum,
          is_direct_upload,
          users ( full_name )
        `)
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToDocument(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch document', 'NETWORK_ERROR', 0);
    }
  }

  static async create(doc: Omit<DocumentItem, 'id' | 'addedAt'>, addedById?: string): Promise<ServiceResult<DocumentItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!doc.title || doc.title.trim().length === 0) return err('Document title is required', 'VALIDATION_ERROR', 400);
    if (!doc.url || doc.url.trim().length === 0) return err('Document URL is required', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapDocumentToDb(doc, addedById);
      dbPayload.id = toValidUuid();

      const { data, error, status } = await supabase
        .from('documents')
        .insert([dbPayload])
        .select(`
          id,
          title,
          type,
          url,
          related_type,
          related_id,
          description,
          added_by,
          created_at,
          storage_path,
          storage_bucket,
          file_size,
          mime_type,
          is_confidential,
          access_tier,
          checksum,
          is_direct_upload,
          users ( full_name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToDocument(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error creating document', 'NETWORK_ERROR', 0);
    }
  }

  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting document', 'NETWORK_ERROR', 0);
    }
  }
}
