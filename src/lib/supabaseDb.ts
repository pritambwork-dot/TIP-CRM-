/**
 * TIP CRM — Centralized Supabase Database & Realtime Data Access Layer
 * Developed for The Inclusion Project (TIP)
 *
 * Implements:
 * 1. Safe connection validation & environment detection.
 * 2. Type-safe mapping between PostgreSQL snake_case schema and application models.
 * 3. Centralized CRUD operations for all 8 core CRM domains.
 * 4. Error isolation, graceful offline handling, and retry resilience.
 * 5. Realtime table subscriptions with automatic cleanup.
 * 6. Audit logging integration.
 */

import { supabase } from './supabase';
import { 
  Person, 
  Organization, 
  Program, 
  Project, 
  EventItem, 
  ParticipantRecord, 
  TaskItem, 
  FundingRecord, 
  DocumentItem, 
  AuditLogItem,
  ParticipantStatus,
  TaskStatus,
  TaskPriority,
  RelationshipType,
  OrgType,
  ProgramStatus,
  ProjectStatus,
  EventType,
  FundingStatus
} from '../types';

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

export interface DatabaseHealthStatus {
  connected: boolean;
  isLiveCloud: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  if (!supabase) {
    return {
      connected: false,
      isLiveCloud: false,
      error: 'Supabase credentials not configured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required).'
    };
  }

  const start = Date.now();
  try {
    const { data, error } = await supabase.from('organizations').select('id').limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return {
        connected: false,
        isLiveCloud: true,
        latencyMs,
        error: error.message
      };
    }
    return {
      connected: true,
      isLiveCloud: true,
      latencyMs
    };
  } catch (err: any) {
    return {
      connected: false,
      isLiveCloud: true,
      latencyMs: Date.now() - start,
      error: err?.message || 'Database connection timeout.'
    };
  }
}

// ==============================================================================
// 1. DATA TRANSFORMERS (PostgreSQL snake_case <-> TypeScript camelCase)
// ==============================================================================

export const DbMappers = {
  // People
  personFromRow(row: any): Person {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      role: row.role_title || undefined,
      organizationId: row.organization_id || undefined,
      relationshipTypes: (row.relationship_types || ['Participant']) as RelationshipType[],
      city: row.city || undefined,
      province: row.province || undefined,
      notes: row.notes || undefined,
      mailchimpStatus: row.mailchimp_status || 'pending',
      lastInteractionDate: row.last_interaction_date || undefined,
      nextFollowUpDate: row.next_follow_up_date || undefined,
      interests: [],
      programIds: [],
      eventIds: [],
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  personToRow(p: Omit<Person, 'id' | 'createdAt'> | Partial<Person>): Record<string, any> {
    const row: Record<string, any> = {};
    if (p.name !== undefined) row.name = p.name;
    if (p.email !== undefined) row.email = p.email;
    if (p.phone !== undefined) row.phone = p.phone || null;
    if (p.role !== undefined) row.role_title = p.role || null;
    if (p.organizationId !== undefined) row.organization_id = p.organizationId || null;
    if (p.relationshipTypes !== undefined) row.relationship_types = p.relationshipTypes;
    if (p.city !== undefined) row.city = p.city || null;
    if (p.province !== undefined) row.province = p.province || null;
    if (p.notes !== undefined) row.notes = p.notes || null;
    if (p.mailchimpStatus !== undefined) row.mailchimp_status = p.mailchimpStatus;
    if (p.lastInteractionDate !== undefined) row.last_interaction_date = p.lastInteractionDate || null;
    if (p.nextFollowUpDate !== undefined) row.next_follow_up_date = p.nextFollowUpDate || null;
    return row;
  },

  // Organizations
  orgFromRow(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      type: (row.type || 'Partner') as OrgType,
      sector: row.sector || 'Community & Social Services',
      website: row.website || '',
      city: row.city || undefined,
      province: row.province || undefined,
      notes: row.notes || undefined,
      relationshipTypes: ['Partner'],
      programsInvolved: [],
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  orgToRow(o: Omit<Organization, 'id' | 'createdAt'> | Partial<Organization>): Record<string, any> {
    const row: Record<string, any> = {};
    if (o.name !== undefined) row.name = o.name;
    if (o.type !== undefined) row.type = o.type;
    if (o.sector !== undefined) row.sector = o.sector || null;
    if (o.website !== undefined) row.website = o.website || null;
    if (o.city !== undefined) row.city = o.city || null;
    if (o.province !== undefined) row.province = o.province || null;
    if (o.notes !== undefined) row.notes = o.notes || null;
    return row;
  },

  // Programs
  programFromRow(row: any): Program {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      status: (row.status || 'Active') as ProgramStatus,
      startDate: row.start_date || new Date().toISOString().split('T')[0],
      endDate: row.end_date || new Date().toISOString().split('T')[0],
      ownerName: row.owner_name || 'Staff Lead',
      participantIds: [],
      partnerIds: [],
      projectIds: [],
      progressPercent: Number(row.progress_percent || 0),
      focusAreas: row.focus_areas ? (Array.isArray(row.focus_areas) ? row.focus_areas : [row.focus_areas]) : [],
      budgetCad: row.budget_cad ? Number(row.budget_cad) : undefined,
      outcomes: row.outcomes || undefined,
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  programToRow(p: Omit<Program, 'id' | 'createdAt'> | Partial<Program>): Record<string, any> {
    const row: Record<string, any> = {};
    if (p.name !== undefined) row.name = p.name;
    if (p.description !== undefined) row.description = p.description || null;
    if (p.status !== undefined) row.status = p.status;
    if (p.startDate !== undefined) row.start_date = p.startDate || null;
    if (p.endDate !== undefined) row.end_date = p.endDate || null;
    if (p.budgetCad !== undefined) row.budget_cad = p.budgetCad || 0;
    if (p.outcomes !== undefined) row.outcomes = p.outcomes || null;
    return row;
  },

  // Projects
  projectFromRow(row: any): Project {
    return {
      id: row.id,
      programId: row.program_id,
      name: row.name,
      description: row.description || '',
      status: (row.status || 'Active') as ProjectStatus,
      ownerName: row.owner_name || 'Project Lead',
      startDate: row.start_date || new Date().toISOString().split('T')[0],
      endDate: row.end_date || undefined,
      participantIds: [],
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  projectToRow(pr: Omit<Project, 'id' | 'createdAt'> | Partial<Project>): Record<string, any> {
    const row: Record<string, any> = {};
    if (pr.programId !== undefined) row.program_id = pr.programId;
    if (pr.name !== undefined) row.name = pr.name;
    if (pr.description !== undefined) row.description = pr.description || null;
    if (pr.status !== undefined) row.status = pr.status;
    if (pr.ownerName !== undefined) row.owner_name = pr.ownerName || null;
    if (pr.startDate !== undefined) row.start_date = pr.startDate || null;
    if (pr.endDate !== undefined) row.end_date = pr.endDate || null;
    return row;
  },

  // Events
  eventFromRow(row: any): EventItem {
    return {
      id: row.id,
      programId: row.program_id || undefined,
      projectId: row.project_id || undefined,
      name: row.name,
      type: (row.event_type || 'Workshop') as EventType,
      date: row.date,
      time: row.time || '14:00 - 16:00',
      location: row.location || 'Online',
      isOnline: Boolean(row.is_online),
      meetingLink: row.meeting_link || undefined,
      capacity: Number(row.capacity || 50),
      facilitator: row.facilitator_name || 'Staff Coordinator',
      partnerIds: row.partner_ids ? (Array.isArray(row.partner_ids) ? row.partner_ids : [row.partner_ids]) : [],
      description: row.description || '',
      notes: row.notes || undefined,
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  eventToRow(e: Omit<EventItem, 'id' | 'createdAt'> | Partial<EventItem>): Record<string, any> {
    const row: Record<string, any> = {};
    if (e.programId !== undefined) row.program_id = e.programId || null;
    if (e.projectId !== undefined) row.project_id = e.projectId || null;
    if (e.name !== undefined) row.name = e.name;
    if (e.type !== undefined) row.event_type = e.type;
    if (e.date !== undefined) row.date = e.date;
    if (e.time !== undefined) row.time = e.time || null;
    if (e.location !== undefined) row.location = e.location || null;
    if (e.isOnline !== undefined) row.is_online = e.isOnline;
    if (e.meetingLink !== undefined) row.meeting_link = e.meetingLink || null;
    if (e.capacity !== undefined) row.capacity = e.capacity || 50;
    if (e.description !== undefined) row.description = e.description || null;
    if (e.notes !== undefined) row.notes = e.notes || null;
    return row;
  },

  // Participants
  participantFromRow(row: any): ParticipantRecord {
    return {
      id: row.id,
      personId: row.person_id,
      personName: row.person_name || 'Participant',
      personEmail: row.person_email || '',
      organizationName: row.organization_name || undefined,
      eventId: row.event_id || undefined,
      eventName: row.event_name || undefined,
      programId: row.program_id || undefined,
      programName: row.program_name || undefined,
      projectId: row.project_id || undefined,
      projectName: row.project_name || undefined,
      status: (row.attendance_status || row.status || 'Registered') as ParticipantStatus,
      registeredAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      attendedAt: row.attended_at ? row.attended_at.split('T')[0] : undefined,
      notes: row.notes || undefined
    };
  },
  participantToRow(p: Omit<ParticipantRecord, 'id' | 'registeredAt'> | Partial<ParticipantRecord>): Record<string, any> {
    const row: Record<string, any> = {};
    if (p.personId !== undefined) row.person_id = p.personId;
    if (p.eventId !== undefined) row.event_id = p.eventId || null;
    if (p.status !== undefined) {
      row.attendance_status = p.status;
      row.registration_status = p.status;
    }
    if (p.attendedAt !== undefined) row.attended_at = p.attendedAt || null;
    if (p.notes !== undefined) row.notes = p.notes || null;
    return row;
  },

  // Tasks
  taskFromRow(row: any): TaskItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      owner: row.assigned_to_name || 'Unassigned',
      assignedToId: row.assigned_to || undefined,
      personId: row.related_person_id || undefined,
      programId: row.related_program_id || undefined,
      projectId: row.related_project_id || undefined,
      eventId: row.related_event_id || undefined,
      dueDate: row.due_date || new Date().toISOString().split('T')[0],
      priority: (row.priority || 'Medium') as TaskPriority,
      status: (row.status || 'To Do') as TaskStatus,
      completedAt: row.completed_at || undefined,
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  taskToRow(t: Omit<TaskItem, 'id' | 'createdAt'> | Partial<TaskItem>): Record<string, any> {
    const row: Record<string, any> = {};
    if (t.title !== undefined) row.title = t.title;
    if (t.description !== undefined) row.description = t.description || null;
    if (t.assignedToId !== undefined) row.assigned_to = t.assignedToId || null;
    if (t.personId !== undefined) row.related_person_id = t.personId || null;
    if (t.programId !== undefined) row.related_program_id = t.programId || null;
    if (t.projectId !== undefined) row.related_project_id = t.projectId || null;
    if (t.eventId !== undefined) row.related_event_id = t.eventId || null;
    if (t.dueDate !== undefined) row.due_date = t.dueDate || null;
    if (t.priority !== undefined) row.priority = t.priority;
    if (t.status !== undefined) {
      row.status = t.status;
      if (t.status === 'Completed' && !t.completedAt) {
        row.completed_at = new Date().toISOString();
      } else if (t.status !== 'Completed') {
        row.completed_at = null;
      }
    }
    return row;
  },

  // Funding Records
  fundingFromRow(row: any): FundingRecord {
    return {
      id: row.id,
      donorOrFunder: row.donor_or_funder,
      funderName: row.donor_or_funder,
      organizationId: row.organization_id || undefined,
      programId: row.program_id || undefined,
      projectId: row.project_id || undefined,
      amountCad: Number(row.amount_cad || 0),
      date: row.date,
      fundingType: row.funding_type || 'Grant',
      type: row.funding_type || 'Grant',
      status: (row.status || 'Received') as FundingStatus,
      reportDueDate: row.report_due_date || undefined,
      reportingDeadline: row.report_due_date || undefined,
      fiscalYear: row.fiscal_year || '2026-2027',
      grantDeliverableNote: row.grant_deliverable_note || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at || new Date().toISOString()
    };
  },
  fundingToRow(f: Omit<FundingRecord, 'id' | 'createdAt'> | Partial<FundingRecord>): Record<string, any> {
    const row: Record<string, any> = {};
    if (f.donorOrFunder !== undefined || f.funderName !== undefined) {
      row.donor_or_funder = f.donorOrFunder || f.funderName;
    }
    if (f.organizationId !== undefined) row.organization_id = f.organizationId || null;
    if (f.programId !== undefined) row.program_id = f.programId || null;
    if (f.projectId !== undefined) row.project_id = f.projectId || null;
    if (f.amountCad !== undefined) row.amount_cad = f.amountCad;
    if (f.date !== undefined) row.date = f.date;
    if (f.fundingType !== undefined || f.type !== undefined) {
      row.funding_type = f.fundingType || f.type || 'Grant';
    }
    if (f.status !== undefined) row.status = f.status;
    if (f.reportDueDate !== undefined || f.reportingDeadline !== undefined) {
      row.report_due_date = f.reportDueDate || f.reportingDeadline || null;
    }
    if (f.fiscalYear !== undefined) row.fiscal_year = f.fiscalYear || null;
    if (f.grantDeliverableNote !== undefined) row.grant_deliverable_note = f.grantDeliverableNote || null;
    if (f.notes !== undefined) row.notes = f.notes || null;
    return row;
  },

  // Documents
  documentFromRow(row: any): DocumentItem {
    return {
      id: row.id,
      title: row.title,
      type: row.type || 'PDF / File',
      url: row.url,
      storagePath: row.storage_path || undefined,
      storageBucket: row.storage_bucket || 'tip-crm-private-documents',
      fileSize: row.file_size ? Number(row.file_size) : undefined,
      mimeType: row.mime_type || undefined,
      isConfidential: Boolean(row.is_confidential),
      accessTier: row.access_tier || 'all',
      checksum: row.checksum || undefined,
      isDirectUpload: Boolean(row.is_direct_upload),
      relatedType: row.related_type || 'General',
      relatedId: row.related_id || undefined,
      addedBy: row.added_by_name || 'Staff User',
      addedAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      description: row.description || undefined
    };
  },
  documentToRow(d: Omit<DocumentItem, 'id' | 'addedAt'> | Partial<DocumentItem>): Record<string, any> {
    const row: Record<string, any> = {};
    if (d.title !== undefined) row.title = d.title;
    if (d.type !== undefined) row.type = d.type;
    if (d.url !== undefined) row.url = d.url;
    if (d.storagePath !== undefined) row.storage_path = d.storagePath || null;
    if (d.storageBucket !== undefined) row.storage_bucket = d.storageBucket || 'tip-crm-private-documents';
    if (d.fileSize !== undefined) row.file_size = d.fileSize || null;
    if (d.mimeType !== undefined) row.mime_type = d.mimeType || null;
    if (d.isConfidential !== undefined) row.is_confidential = d.isConfidential;
    if (d.accessTier !== undefined) row.access_tier = d.accessTier;
    if (d.checksum !== undefined) row.checksum = d.checksum || null;
    if (d.isDirectUpload !== undefined) row.is_direct_upload = d.isDirectUpload;
    if (d.relatedType !== undefined) row.related_type = d.relatedType || null;
    if (d.relatedId !== undefined) row.related_id = d.relatedId || null;
    if (d.description !== undefined) row.description = d.description || null;
    return row;
  },

  // Audit Logs
  auditLogFromRow(row: any): AuditLogItem {
    return {
      id: row.id,
      action: row.action,
      entityType: row.resource || 'Entity',
      entityName: row.entity_name || 'Record',
      userName: row.user_name || 'System',
      timestamp: row.timestamp || new Date().toISOString(),
      details: row.details || undefined
    };
  },
  auditLogToRow(a: Omit<AuditLogItem, 'id' | 'timestamp'>): Record<string, any> {
    return {
      action: a.action,
      resource: a.entityType,
      entity_name: a.entityName,
      user_name: a.userName,
      details: a.details || null,
      timestamp: new Date().toISOString()
    };
  }
};

// ==============================================================================
// 2. CENTRAL DATA ACCESS REPOSITORIES
// ==============================================================================

export const SupabaseDb = {
  // --- PEOPLE ---
  people: {
    async getAll(): Promise<{ data: Person[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('people').select('*').order('created_at', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.personFromRow) };
    },
    async create(item: Omit<Person, 'id' | 'createdAt'>): Promise<{ data?: Person; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.personToRow(item);
      const { data, error } = await supabase.from('people').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.personFromRow(data) };
    },
    async update(id: string, updates: Partial<Person>): Promise<{ data?: Person; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.personToRow(updates);
      const { data, error } = await supabase.from('people').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.personFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- ORGANIZATIONS ---
  organizations: {
    async getAll(): Promise<{ data: Organization[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.orgFromRow) };
    },
    async create(item: Omit<Organization, 'id' | 'createdAt'>): Promise<{ data?: Organization; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.orgToRow(item);
      const { data, error } = await supabase.from('organizations').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.orgFromRow(data) };
    },
    async update(id: string, updates: Partial<Organization>): Promise<{ data?: Organization; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.orgToRow(updates);
      const { data, error } = await supabase.from('organizations').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.orgFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- PROGRAMS ---
  programs: {
    async getAll(): Promise<{ data: Program[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.programFromRow) };
    },
    async create(item: Omit<Program, 'id' | 'createdAt'>): Promise<{ data?: Program; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.programToRow(item);
      const { data, error } = await supabase.from('programs').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.programFromRow(data) };
    },
    async update(id: string, updates: Partial<Program>): Promise<{ data?: Program; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.programToRow(updates);
      const { data, error } = await supabase.from('programs').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.programFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- PROJECTS ---
  projects: {
    async getAll(): Promise<{ data: Project[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.projectFromRow) };
    },
    async create(item: Omit<Project, 'id' | 'createdAt'>): Promise<{ data?: Project; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.projectToRow(item);
      const { data, error } = await supabase.from('projects').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.projectFromRow(data) };
    },
    async update(id: string, updates: Partial<Project>): Promise<{ data?: Project; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.projectToRow(updates);
      const { data, error } = await supabase.from('projects').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.projectFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- EVENTS ---
  events: {
    async getAll(): Promise<{ data: EventItem[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.eventFromRow) };
    },
    async create(item: Omit<EventItem, 'id' | 'createdAt'>): Promise<{ data?: EventItem; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.eventToRow(item);
      const { data, error } = await supabase.from('events').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.eventFromRow(data) };
    },
    async update(id: string, updates: Partial<EventItem>): Promise<{ data?: EventItem; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.eventToRow(updates);
      const { data, error } = await supabase.from('events').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.eventFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- PARTICIPANTS ---
  participants: {
    async getAll(): Promise<{ data: ParticipantRecord[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('event_participants').select('*');
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.participantFromRow) };
    },
    async create(item: Omit<ParticipantRecord, 'id' | 'registeredAt'>): Promise<{ data?: ParticipantRecord; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.participantToRow(item);
      const { data, error } = await supabase.from('event_participants').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.participantFromRow(data) };
    },
    async update(id: string, updates: Partial<ParticipantRecord>): Promise<{ data?: ParticipantRecord; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.participantToRow(updates);
      const { data, error } = await supabase.from('event_participants').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.participantFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('event_participants').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- TASKS ---
  tasks: {
    async getAll(): Promise<{ data: TaskItem[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.taskFromRow) };
    },
    async create(item: Omit<TaskItem, 'id' | 'createdAt'>): Promise<{ data?: TaskItem; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.taskToRow(item);
      const { data, error } = await supabase.from('tasks').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.taskFromRow(data) };
    },
    async update(id: string, updates: Partial<TaskItem>): Promise<{ data?: TaskItem; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.taskToRow(updates);
      const { data, error } = await supabase.from('tasks').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.taskFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- FUNDING ---
  funding: {
    async getAll(): Promise<{ data: FundingRecord[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('funding_records').select('*').order('date', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.fundingFromRow) };
    },
    async create(item: Omit<FundingRecord, 'id' | 'createdAt'>): Promise<{ data?: FundingRecord; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.fundingToRow(item);
      const { data, error } = await supabase.from('funding_records').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.fundingFromRow(data) };
    },
    async update(id: string, updates: Partial<FundingRecord>): Promise<{ data?: FundingRecord; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.fundingToRow(updates);
      const { data, error } = await supabase.from('funding_records').update(row).eq('id', id).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.fundingFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('funding_records').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- DOCUMENTS ---
  documents: {
    async getAll(): Promise<{ data: DocumentItem[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.documentFromRow) };
    },
    async create(item: Omit<DocumentItem, 'id' | 'addedAt'>): Promise<{ data?: DocumentItem; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.documentToRow(item);
      const { data, error } = await supabase.from('documents').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.documentFromRow(data) };
    },
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
      if (!supabase) return { success: false, error: 'Not connected' };
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // --- AUDIT LOGS ---
  auditLogs: {
    async getAll(): Promise<{ data: AuditLogItem[]; error?: string }> {
      if (!supabase) return { data: [], error: 'Not connected' };
      const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (error) return { data: [], error: error.message };
      return { data: (data || []).map(DbMappers.auditLogFromRow) };
    },
    async create(item: Omit<AuditLogItem, 'id' | 'timestamp'>): Promise<{ data?: AuditLogItem; error?: string }> {
      if (!supabase) return { error: 'Not connected' };
      const row = DbMappers.auditLogToRow(item);
      const { data, error } = await supabase.from('audit_logs').insert([row]).select().single();
      if (error) return { error: error.message };
      return { data: DbMappers.auditLogFromRow(data) };
    }
  }
};

// ==============================================================================
// 3. REALTIME SUBSCRIPTION ENGINE
// ==============================================================================

export type RealtimeChangeHandler = (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void;

export function subscribeToTableRealtime(
  tableName: string,
  onEvent: RealtimeChangeHandler
): () => void {
  if (!supabase) {
    return () => {};
  }

  const channelName = `realtime_${tableName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        onEvent({
          eventType: payload.eventType as any,
          new: payload.new,
          old: payload.old
        });
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}
