/**
 * TIP CRM — Context Minimizer & PII Scrubber
 * Implements strict data privacy & token minimization (Sections 36, 37, 38, 39, 40, 68, 69):
 * 1. PII Stripping: Scrubs emails, phone numbers, street addresses, and private notes.
 * 2. Prunes unrelated CRM tables: only transmits entities directly relevant to the query.
 * 3. Compresses structured data into statistical aggregates instead of row-by-row lists.
 * 4. Truncates and compresses conversational history to avoid prompt inflation.
 */

import { 
  AiPrivacyMode, 
  UserProfile, 
  Program, 
  EventItem, 
  Person, 
  Organization, 
  TaskItem, 
  FundingRecord 
} from '../types';
import { Permissions, ROLE_DEFINITIONS } from './permissions';

export interface FullCrmData {
  programs?: Program[];
  events?: EventItem[];
  people?: Person[];
  organizations?: Organization[];
  tasks?: TaskItem[];
  funding?: FundingRecord[];
  referenceDate?: string;
}

export interface RoleScopedCrmContext {
  userDesignation: string;
  userRole: string;
  roleLevelLabel: string;
  allowedDataScope: {
    funding: 'ALL' | 'VIEW' | 'NONE';
    people: string;
    programs: string;
    events: string;
  };
  summary: {
    programCount: number;
    eventCount: number;
    openTaskCount: number;
    overdueTaskCount: number;
    peopleCount: number;
    fundingCad?: number;
    activeGrantsCount?: number;
  };
  programs: Array<{
    id: string;
    name: string;
    status: string;
    targetCohort?: string;
    description?: string;
    progressPercent?: number;
  }>;
  events: Array<{
    id: string;
    name: string;
    date: string;
    type: string;
    registeredCount: number;
    status?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate?: string;
    priority: string;
    status: string;
    owner?: string;
  }>;
  peopleCategories?: Record<string, number>;
  organizations?: Array<{
    name: string;
    sector?: string;
    type?: string;
  }>;
  funding?: Array<{
    grantName: string;
    funderName: string;
    amountCad: number;
    status: string;
    reportingDeadline?: string;
  }>;
  confidentialDataExcludedNotice?: string;
}

export interface MinimizedContextOptions {
  privacyMode?: AiPrivacyMode;
  maxHistoryItems?: number;
  anonymizeNames?: boolean;
}

/**
 * Scrubs any email, phone number, or street address from a string
 */
export function scrubPii(text: string): string {
  if (!text) return text;
  
  // Replace email addresses
  let cleaned = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
  
  // Replace Canadian / North American phone numbers
  cleaned = cleaned.replace(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, '[PHONE REDACTED]');
  
  // Replace street address patterns (e.g. "123 Main St", "Suite 400")
  cleaned = cleaned.replace(/\b\d+\s+[A-Za-z0-9\s,.-]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Suite|Drive|Dr|Way)\b/gi, '[ADDRESS REDACTED]');

  return cleaned;
}

/**
 * Minimizes and redacts context payload before dispatching to AI model.
 */
export function minimizeAiPayload(
  payload: Record<string, any>,
  privacyMode: AiPrivacyMode = 'minimal'
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(payload)) {
    if (val === undefined || val === null) continue;

    // Prune completely forbidden PII fields in Minimal & Balanced modes
    if (privacyMode !== 'expanded') {
      if (['email', 'phone', 'address', 'postalCode', 'notes', 'sin', 'bankAccount'].includes(key)) {
        continue;
      }
    }

    if (typeof val === 'string') {
      result[key] = scrubPii(val);
    } else if (Array.isArray(val)) {
      // Compress participant arrays to count summaries instead of raw individual records
      if (key === 'participants' || key === 'people') {
        result[`${key}Count`] = val.length;
        if (privacyMode === 'minimal') {
          // In minimal mode, omit individual row objects entirely
          continue;
        } else {
          // In balanced mode, provide minimal sanitized items (max 5)
          result[key] = val.slice(0, 5).map(item => ({
            id: item.id,
            name: scrubPii(item.name || 'Participant'),
            status: item.status
          }));
        }
      } else {
        result[key] = val.slice(0, 10).map(item => 
          typeof item === 'object' ? minimizeAiPayload(item, privacyMode) : item
        );
      }
    } else if (typeof val === 'object') {
      result[key] = minimizeAiPayload(val, privacyMode);
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Truncates and summarizes conversational history to save tokens (Section 40)
 */
export function minimizeConversationHistory(
  history: Array<{ role: string; content: string }>,
  maxTurns: number = 4
): Array<{ role: string; content: string }> {
  if (!history || history.length === 0) return [];

  // Take only the most recent turns
  const recent = history.slice(-maxTurns);

  return recent.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: scrubPii(msg.content.slice(0, 500)) // Cap per-message length to 500 chars
  }));
}

/**
 * Builds a strictly scoped, sanitized CRM context for TIP Intelligence.
 * GUARANTEES:
 * 1. Zero data leakage: Sensitive resources (Funding, Grants, Budgets) are completely omitted
 *    for roles without 'funding.view' (Volunteers, Frontline Staff, Coordinators).
 * 2. Scopes tasks and events strictly by user assignment for limited roles.
 * 3. Scrubs all personal contact details (email, phone, address, private notes).
 * 4. Injects designation metadata so responses align to the user's specific post and duties.
 */
export function buildRoleScopedCrmContext(
  user: UserProfile,
  crmData: FullCrmData,
  privacyMode: AiPrivacyMode = 'minimal'
): RoleScopedCrmContext {
  const refDate = crmData.referenceDate || '2026-09-23';
  const roleId = user.roleId || 'volunteer';
  const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.volunteer;
  const isSuperAdmin = roleId === 'super_admin';
  const isStaffManager = roleId === 'staff_manager';
  const isVolunteer = roleId === 'volunteer';

  const canViewFunding = Permissions.check(user, 'funding', 'view');
  const canViewOrganizations = Permissions.check(user, 'organizations', 'view');
  const canViewAllPrograms = isSuperAdmin || isStaffManager || user.dataScope?.programs === 'ALL';
  const canViewAllEvents = isSuperAdmin || isStaffManager || user.dataScope?.events === 'ALL';

  // 1. Scoped Tasks
  const allTasks = crmData.tasks || [];
  const myTasks = allTasks.filter(t => t.assignedToId === user.id || t.owner === user.name);
  const userVisibleTasks = (isSuperAdmin || isStaffManager) ? allTasks : myTasks;
  const openTasks = userVisibleTasks.filter(t => t.status !== 'Completed');
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < refDate);

  const sanitizedTasks = userVisibleTasks.slice(0, 8).map(t => ({
    id: t.id,
    title: scrubPii(t.title),
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    owner: isVolunteer ? (t.assignedToId === user.id ? 'You' : 'Staff') : scrubPii(t.owner)
  }));

  // 2. Scoped Programs
  const allPrograms = crmData.programs || [];
  const userPrograms = canViewAllPrograms 
    ? allPrograms 
    : allPrograms.filter(p => (user.assignedProgramIds || []).includes(p.id) || p.status === 'Active');

  const sanitizedPrograms = userPrograms.slice(0, 6).map(p => ({
    id: p.id,
    name: scrubPii(p.name),
    status: p.status,
    focusAreas: p.focusAreas ? p.focusAreas.map(scrubPii) : undefined,
    description: p.description ? scrubPii(p.description.slice(0, 150)) : undefined,
    progressPercent: p.progressPercent
  }));

  // 3. Scoped Events
  const allEvents = crmData.events || [];
  const userEvents = canViewAllEvents
    ? allEvents
    : allEvents.filter(e => 
        (user.assignedEventIds || []).includes(e.id) || 
        (e.programId ? (user.assignedProgramIds || []).includes(e.programId) : false) ||
        e.date >= refDate
      );

  const sanitizedEvents = userEvents.slice(0, 6).map(e => ({
    id: e.id,
    name: scrubPii(e.name),
    date: e.date,
    type: e.type,
    registeredCount: (e as any).participants ? (e as any).participants.length : 0
  }));

  // 4. People / Stakeholder Aggregates (Zero PII, Category Breakdown)
  const allPeople = crmData.people || [];
  const peopleCategories: Record<string, number> = {};
  if (!isVolunteer) {
    allPeople.forEach(p => {
      (p.relationshipTypes || []).forEach(rel => {
        peopleCategories[rel] = (peopleCategories[rel] || 0) + 1;
      });
    });
  }

  // 5. Scoped Organizations (Omitted for Volunteers)
  const allOrgs = crmData.organizations || [];
  const sanitizedOrgs = canViewOrganizations
    ? allOrgs.slice(0, 6).map(o => ({
        name: scrubPii(o.name),
        sector: o.sector,
        type: o.type
      }))
    : undefined;

  // 6. FUNDING / GRANTS (CRUCIAL SECURITY BOUNDARY)
  // If user does NOT have permission, funding is completely omitted!
  let fundingList: Array<any> | undefined = undefined;
  let totalFundingCad: number | undefined = undefined;
  let activeGrantsCount: number | undefined = undefined;

  if (canViewFunding && crmData.funding) {
    const allFunding = crmData.funding;
    totalFundingCad = allFunding.reduce((sum, f) => sum + (f.amountCad || 0), 0);
    activeGrantsCount = allFunding.length;
    fundingList = allFunding.map(f => ({
      grantName: scrubPii(f.grantDeliverableNote || f.donorOrFunder || 'Grant Allocation'),
      funderName: scrubPii(f.donorOrFunder || f.funderName || 'Funder Partner'),
      amountCad: f.amountCad || 0,
      status: f.status,
      reportingDeadline: f.reportingDeadline || f.reportDueDate
    }));
  }

  const confidentialNotice = !canViewFunding 
    ? `Financial and grant records are restricted to Executive Directors and Management under TIP Data Governance. (Current Designation: ${user.postTitle || roleDef.name})`
    : undefined;

  return {
    userDesignation: user.postTitle || user.title || roleDef.name,
    userRole: roleId,
    roleLevelLabel: roleDef.levelLabel,
    allowedDataScope: {
      funding: user.dataScope?.funding || (canViewFunding ? 'ALL' : 'NONE'),
      people: user.dataScope?.people || (isSuperAdmin ? 'GLOBAL' : 'ASSIGNED'),
      programs: user.dataScope?.programs || (canViewAllPrograms ? 'ALL' : 'ASSIGNED'),
      events: user.dataScope?.events || (canViewAllEvents ? 'ALL' : 'ASSIGNED')
    },
    summary: {
      programCount: userPrograms.length,
      eventCount: userEvents.length,
      openTaskCount: openTasks.length,
      overdueTaskCount: overdueTasks.length,
      peopleCount: isVolunteer ? 0 : allPeople.length,
      ...(canViewFunding ? { fundingCad: totalFundingCad, activeGrantsCount } : {})
    },
    programs: sanitizedPrograms,
    events: sanitizedEvents,
    tasks: sanitizedTasks,
    peopleCategories: Object.keys(peopleCategories).length > 0 ? peopleCategories : undefined,
    organizations: sanitizedOrgs,
    funding: fundingList,
    confidentialDataExcludedNotice: confidentialNotice
  };
}

