/**
 * TIP CRM - Tasks Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Tasks.
 * Supports task assignment, status toggling, due dates, priority, and activity tracking.
 */

import { supabase } from '../supabase';
import { TaskItem, TaskPriority, TaskStatus } from '../../types';
import { ServiceResult, ok, err, toValidUuid, toIsoDate, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbTaskRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  related_person_id: string | null;
  related_program_id: string | null;
  related_event_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
  users?: { full_name: string } | null;
  people?: { name: string } | null;
  programs?: { name: string } | null;
  events?: { name: string } | null;
}

export function mapDbToTask(row: any): TaskItem {
  const userName = Array.isArray(row.users) ? row.users[0]?.full_name : row.users?.full_name;
  const personName = Array.isArray(row.people) ? row.people[0]?.name : row.people?.name;
  const programName = Array.isArray(row.programs) ? row.programs[0]?.name : row.programs?.name;
  const eventName = Array.isArray(row.events) ? row.events[0]?.name : row.events?.name;

  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    owner: userName || 'Staff Member',
    assignedToId: row.assigned_to || undefined,
    personId: row.related_person_id || undefined,
    personName: personName || undefined,
    programId: row.related_program_id || undefined,
    programName: programName || undefined,
    eventId: row.related_event_id || undefined,
    eventName: eventName || undefined,
    dueDate: row.due_date || '',
    priority: (row.priority as TaskPriority) || 'Medium',
    status: (row.status as TaskStatus) || 'To Do',
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    updatedAt: row.updated_at || undefined
  };
}

export function mapTaskToDb(task: Partial<TaskItem>, creatorId?: string): Record<string, any> {
  const row: Record<string, any> = {};

  if (task.title !== undefined) row.title = task.title.trim();
  if (task.description !== undefined) row.description = task.description || null;
  if (task.assignedToId !== undefined) {
    row.assigned_to = isUuid(task.assignedToId) ? task.assignedToId : null;
  }
  if (task.personId !== undefined) {
    row.related_person_id = isUuid(task.personId) ? task.personId : null;
  }
  if (task.programId !== undefined) {
    row.related_program_id = isUuid(task.programId) ? task.programId : null;
  }
  if (task.eventId !== undefined) {
    row.related_event_id = isUuid(task.eventId) ? task.eventId : null;
  }
  if (task.dueDate !== undefined) row.due_date = task.dueDate ? toIsoDate(task.dueDate) : null;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.status !== undefined) {
    row.status = task.status;
    if (task.status === 'Completed') {
      row.completed_at = new Date().toISOString();
    } else {
      row.completed_at = null;
    }
  }
  if (creatorId && isUuid(creatorId)) row.created_by = creatorId;

  return row;
}

export class TasksService {
  static async getAll(): Promise<ServiceResult<TaskItem[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          assigned_to,
          created_by,
          related_person_id,
          related_program_id,
          related_event_id,
          due_date,
          priority,
          status,
          completed_at,
          created_at,
          updated_at,
          users ( full_name ),
          people ( name ),
          programs ( name ),
          events ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        clientSafeLogger.warn('TasksService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToTask));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching tasks', 'NETWORK_ERROR', 0);
    }
  }

  static async getById(id: string): Promise<ServiceResult<TaskItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    const validId = toValidUuid(id);

    try {
      const { data, error, status } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          assigned_to,
          created_by,
          related_person_id,
          related_program_id,
          related_event_id,
          due_date,
          priority,
          status,
          completed_at,
          created_at,
          updated_at,
          users ( full_name ),
          people ( name ),
          programs ( name ),
          events ( name )
        `)
        .eq('id', validId)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToTask(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch task', 'NETWORK_ERROR', 0);
    }
  }

  static async create(task: Omit<TaskItem, 'id' | 'createdAt'> & { id?: string }, creatorId?: string): Promise<ServiceResult<TaskItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!task.title || task.title.trim().length === 0) return err('Task title is required', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapTaskToDb(task, creatorId);
      dbPayload.id = toValidUuid(task.id);

      const { data, error, status } = await supabase
        .from('tasks')
        .insert([dbPayload])
        .select(`
          id,
          title,
          description,
          assigned_to,
          created_by,
          related_person_id,
          related_program_id,
          related_event_id,
          due_date,
          priority,
          status,
          completed_at,
          created_at,
          updated_at,
          users ( full_name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToTask(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error creating task', 'NETWORK_ERROR', 0);
    }
  }

  static async update(id: string, updates: Partial<TaskItem>): Promise<ServiceResult<TaskItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    const validId = toValidUuid(id);

    try {
      const dbPayload = mapTaskToDb(updates);
      dbPayload.updated_at = new Date().toISOString();

      const { data, error, status } = await supabase
        .from('tasks')
        .update(dbPayload)
        .eq('id', validId)
        .select(`
          id,
          title,
          description,
          assigned_to,
          created_by,
          related_person_id,
          related_program_id,
          related_event_id,
          due_date,
          priority,
          status,
          completed_at,
          created_at,
          updated_at,
          users ( full_name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToTask(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating task', 'NETWORK_ERROR', 0);
    }
  }

  static async toggleStatus(id: string, currentStatus: TaskStatus): Promise<ServiceResult<TaskItem>> {
    const nextStatus: TaskStatus = currentStatus === 'Completed' ? 'To Do' : 'Completed';
    return this.update(id, { status: nextStatus });
  }

  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    const validId = toValidUuid(id);

    try {
      const { error, status } = await supabase
        .from('tasks')
        .delete()
        .eq('id', validId);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting task', 'NETWORK_ERROR', 0);
    }
  }
}
