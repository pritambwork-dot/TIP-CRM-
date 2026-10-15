/**
 * TIP CRM - Events & Attendance Service
 *
 * Real asynchronous PostgreSQL / Supabase operations for Events, Sessions,
 * Event Participants, and Attendance tracking.
 */

import { supabase } from '../supabase';
import { EventItem, EventType, ParticipantRecord, ParticipantStatus } from '../../types';
import { ServiceResult, ok, err, toValidUuid, toIsoDate, isUuid } from './types';
import { clientSafeLogger } from '../safeErrors';

export interface DbEventRow {
  id: string;
  name: string;
  event_type: string;
  program_id: string | null;
  date: string;
  time: string | null;
  location: string | null;
  is_online: boolean;
  meeting_link: string | null;
  capacity: number | null;
  facilitator_id: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  programs?: { name: string } | null;
  users?: { full_name: string } | null;
  event_participants?: Array<{
    id: string;
    person_id: string;
    registration_status: string;
    attendance_status: string;
    attended_at: string | null;
    notes: string | null;
    people?: { name: string; email: string } | null;
  }>;
}

export function mapDbToEvent(row: any): EventItem {
  const participants: ParticipantRecord[] = Array.isArray(row.event_participants)
    ? row.event_participants.map((ep: any) => {
        const personObj = Array.isArray(ep.people) ? ep.people[0] : ep.people;
        return {
          id: ep.id,
          personId: ep.person_id,
          personName: personObj?.name || 'Unknown',
          personEmail: personObj?.email || '',
          eventId: row.id,
          eventName: row.name,
          programId: row.program_id || undefined,
          programName: (Array.isArray(row.programs) ? row.programs[0]?.name : row.programs?.name) || undefined,
          status: (ep.attendance_status as ParticipantStatus) || (ep.registration_status as ParticipantStatus) || 'Registered',
          registeredAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          attendedAt: ep.attended_at || undefined,
          notes: ep.notes || undefined
        };
      })
    : [];

  const programName = Array.isArray(row.programs) ? row.programs[0]?.name : row.programs?.name;
  const facilitatorName = Array.isArray(row.users) ? row.users[0]?.full_name : row.users?.full_name;

  return {
    id: row.id,
    name: row.name,
    type: (row.event_type as EventType) || 'Workshop',
    programId: row.program_id || undefined,
    programName: programName || undefined,
    date: row.date || '',
    time: row.time || '10:00 AM',
    location: row.location || (row.is_online ? 'Online' : 'Main Hall'),
    isOnline: Boolean(row.is_online),
    meetingLink: row.meeting_link || undefined,
    facilitator: facilitatorName || 'Staff Facilitator',
    partnerIds: [],
    capacity: row.capacity || 50,
    description: row.description || undefined,
    notes: row.notes || undefined,
    participants,
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  };
}

export function mapEventToDb(evt: Partial<EventItem>, facilitatorId?: string): Record<string, any> {
  const row: Record<string, any> = {};

  if (evt.name !== undefined) row.name = evt.name.trim();
  if (evt.type !== undefined) row.event_type = evt.type;
  if (evt.programId !== undefined) {
    row.program_id = isUuid(evt.programId) ? evt.programId : null;
  }
  if (evt.date !== undefined) row.date = toIsoDate(evt.date);
  if (evt.time !== undefined) row.time = evt.time;
  if (evt.location !== undefined) row.location = evt.location.trim();
  if (evt.isOnline !== undefined) row.is_online = Boolean(evt.isOnline);
  if (evt.meetingLink !== undefined) row.meeting_link = evt.meetingLink?.trim() || null;
  if (evt.capacity !== undefined) row.capacity = Number(evt.capacity) || 50;
  if (evt.description !== undefined) row.description = evt.description || null;
  if (evt.notes !== undefined) row.notes = evt.notes || null;
  if (facilitatorId && isUuid(facilitatorId)) row.facilitator_id = facilitatorId;

  return row;
}

export class EventsService {
  static async getAll(): Promise<ServiceResult<EventItem[]>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);

    try {
      const { data, error, status } = await supabase
        .from('events')
        .select(`
          id,
          name,
          event_type,
          program_id,
          date,
          time,
          location,
          is_online,
          meeting_link,
          capacity,
          facilitator_id,
          description,
          notes,
          created_at,
          updated_at,
          programs ( name ),
          users ( full_name ),
          event_participants (
            id,
            person_id,
            registration_status,
            attendance_status,
            attended_at,
            notes,
            people ( name, email )
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        clientSafeLogger.warn('EventsService.getAll error:', error.message);
        return err(error.message, error.code, status);
      }

      return ok((data || []).map(mapDbToEvent));
    } catch (exc: any) {
      return err(exc?.message || 'Network error fetching events', 'NETWORK_ERROR', 0);
    }
  }

  static async getById(id: string): Promise<ServiceResult<EventItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { data, error, status } = await supabase
        .from('events')
        .select(`
          id,
          name,
          event_type,
          program_id,
          date,
          time,
          location,
          is_online,
          meeting_link,
          capacity,
          facilitator_id,
          description,
          notes,
          created_at,
          updated_at,
          programs ( name ),
          users ( full_name ),
          event_participants (
            id,
            person_id,
            registration_status,
            attendance_status,
            attended_at,
            notes,
            people ( name, email )
          )
        `)
        .eq('id', id)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToEvent(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Failed to fetch event', 'NETWORK_ERROR', 0);
    }
  }

  static async create(evt: Omit<EventItem, 'id' | 'createdAt'>, facilitatorId?: string): Promise<ServiceResult<EventItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!evt.name || evt.name.trim().length === 0) return err('Event name is required', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapEventToDb(evt, facilitatorId);
      dbPayload.id = toValidUuid();

      const { data, error, status } = await supabase
        .from('events')
        .insert([dbPayload])
        .select(`
          id,
          name,
          event_type,
          program_id,
          date,
          time,
          location,
          is_online,
          meeting_link,
          capacity,
          facilitator_id,
          description,
          notes,
          created_at,
          updated_at,
          programs ( name ),
          users ( full_name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToEvent(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error creating event', 'NETWORK_ERROR', 0);
    }
  }

  static async update(id: string, updates: Partial<EventItem>): Promise<ServiceResult<EventItem>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const dbPayload = mapEventToDb(updates);
      dbPayload.updated_at = new Date().toISOString();

      const { data, error, status } = await supabase
        .from('events')
        .update(dbPayload)
        .eq('id', id)
        .select(`
          id,
          name,
          event_type,
          program_id,
          date,
          time,
          location,
          is_online,
          meeting_link,
          capacity,
          facilitator_id,
          description,
          notes,
          created_at,
          updated_at,
          programs ( name ),
          users ( full_name )
        `)
        .single();

      if (error) return err(error.message, error.code, status);
      return ok(mapDbToEvent(data as any));
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating event', 'NETWORK_ERROR', 0);
    }
  }

  static async delete(id: string): Promise<ServiceResult<{ id: string; success: boolean }>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(id)) return err('Invalid ID format', 'VALIDATION_ERROR', 400);

    try {
      const { error, status } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) return err(error.message, error.code, status);
      return ok({ id, success: true });
    } catch (exc: any) {
      return err(exc?.message || 'Network error deleting event', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Update attendance status for a participant in an event
   */
  static async updateParticipantStatus(
    participantRecordId: string, 
    status: ParticipantStatus
  ): Promise<ServiceResult<boolean>> {
    if (!supabase) return err('Supabase client not configured', 'NOT_CONFIGURED', 503);
    if (!isUuid(participantRecordId)) return err('Invalid record ID format', 'VALIDATION_ERROR', 400);

    try {
      const updates: Record<string, any> = {
        attendance_status: status
      };
      if (status === 'Attended') {
        updates.attended_at = new Date().toISOString();
      }

      const { error, status: httpStatus } = await supabase
        .from('event_participants')
        .update(updates)
        .eq('id', participantRecordId);

      if (error) return err(error.message, error.code, httpStatus);
      return ok(true);
    } catch (exc: any) {
      return err(exc?.message || 'Network error updating attendance', 'NETWORK_ERROR', 0);
    }
  }
}
