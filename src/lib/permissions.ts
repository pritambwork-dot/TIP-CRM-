import { 
  RoleId, 
  ResourceType, 
  ActionType, 
  UserProfile, 
  UserDataScope,
  Person,
  Program,
  EventItem,
  TaskItem
} from '../types';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  level: number;
  levelLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  defaultDataScope: UserDataScope;
  defaultPermissions: Record<string, boolean>;
}


const ALL_PERMISSIONS = [
  "people.view",
  "people.create",
  "people.edit",
  "people.delete",
  "people.export",
  "people.import",
  "organizations.view",
  "organizations.create",
  "organizations.edit",
  "organizations.delete",
  "programs.view",
  "programs.create",
  "programs.edit",
  "programs.delete",
  "events.view",
  "events.create",
  "events.edit",
  "events.delete",
  "participants.view",
  "participants.create",
  "participants.edit",
  "participants.delete",
  "tasks.view",
  "tasks.create",
  "tasks.edit",
  "tasks.delete",
  "tasks.assign",
  "interactions.view",
  "interactions.create",
  "interactions.edit",
  "funding.view",
  "funding.create",
  "funding.edit",
  "funding.delete",
  "reports.view",
  "reports.export",
  "documents.view",
  "documents.create",
  "documents.delete",
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "users.manage",
  "settings.view",
  "settings.edit",
  "settings.manage",
  "integrations.manage",
  "audit_logs.view",
  "intelligence.view",
  "intelligence.create",
  "intelligence.manage",
  "intelligence.export"
];

const makePermissions = (allowed: string[]): Record<string, boolean> => {
  const allowedSet = new Set(allowed);
  return Object.fromEntries(ALL_PERMISSIONS.map(k => [k, allowedSet.has(k)]));
};

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    level: 1,
    levelLabel: 'Level 1 — Super Admin',
    description: 'Full authority layer: controls users, security, permissions, data scopes, audit logs, and all records.',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    defaultDataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'ALL'
    },
    defaultPermissions: makePermissions(ALL_PERMISSIONS)
  },

  staff_manager: {
    id: 'staff_manager',
    name: 'Staff Manager',
    level: 2,
    levelLabel: 'Level 2 — Staff Manager',
    description: 'Operations management: oversees organizational records, manages programs & events, assigns tasks, views reports and funding.',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
    defaultDataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'VIEW'
    },
    defaultPermissions: makePermissions(["people.view","people.create","people.edit","people.export","people.import","organizations.view","organizations.create","organizations.edit","programs.view","programs.create","programs.edit","events.view","events.create","events.edit","participants.view","participants.create","participants.edit","tasks.view","tasks.create","tasks.edit","tasks.delete","tasks.assign","interactions.view","interactions.create","interactions.edit","funding.view","reports.view","reports.export","documents.view","documents.create","users.view","settings.view","audit_logs.view","intelligence.view","intelligence.create","intelligence.export"])
  },

  staff_member: {
    id: 'staff_member',
    name: 'Staff Member',
    level: 3,
    levelLabel: 'Level 3 — Staff Member',
    description: 'Frontline staff: manages assigned programs & events, logs community interactions, completes tasks, and accesses relevant contacts.',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    defaultDataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    defaultPermissions: makePermissions(["people.view","people.create","people.edit","organizations.view","organizations.create","programs.view","programs.edit","events.view","events.create","events.edit","participants.view","participants.create","participants.edit","tasks.view","tasks.create","tasks.edit","interactions.view","interactions.create","interactions.edit","reports.view","documents.view","documents.create","intelligence.view","intelligence.create","intelligence.export"])
  },

  volunteer: {
    id: 'volunteer',
    name: 'Volunteer',
    level: 4,
    levelLabel: 'Level 4 — Volunteer',
    description: 'Restricted role: strictly scoped to assigned events, tasks, and limited workshop participant info. Funding & user management are hidden.',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    defaultDataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    defaultPermissions: makePermissions(["people.view","programs.view","events.view","participants.view","participants.edit","tasks.view","tasks.create","tasks.edit","interactions.view","interactions.create","documents.view","intelligence.view"])
  },

  program_coordinator: {
    id: 'program_coordinator',
    name: 'Program Coordinator',
    level: 3,
    levelLabel: 'Level 3 — Program Coordinator',
    description: 'Program operations & cohort delivery: manages program milestones, cohort participants, program tasks, follow-up touchpoints, and program reports.',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-700',
    defaultDataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    defaultPermissions: makePermissions(["people.view","people.create","people.edit","organizations.view","organizations.create","programs.view","programs.create","programs.edit","events.view","events.create","events.edit","participants.view","participants.create","participants.edit","tasks.view","tasks.create","tasks.edit","tasks.assign","interactions.view","interactions.create","interactions.edit","reports.view","documents.view","documents.create","intelligence.view","intelligence.create","intelligence.export"])
  },

  event_coordinator: {
    id: 'event_coordinator',
    name: 'Event Coordinator',
    level: 3,
    levelLabel: 'Level 3 — Event Coordinator',
    description: 'Event logistics & workshop coordination: manages event preparation, attendance check-ins, participant accessibility accommodations, venue logistics, and event follow-ups.',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-700',
    defaultDataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    defaultPermissions: makePermissions(["people.view","people.create","people.edit","organizations.view","programs.view","events.view","events.create","events.edit","participants.view","participants.create","participants.edit","tasks.view","tasks.create","tasks.edit","tasks.assign","interactions.view","interactions.create","interactions.edit","reports.view","documents.view","documents.create","intelligence.view","intelligence.create","intelligence.export"])
  }
};


/**
 * Check if a user has permission to perform an action on a resource.
 * Checks user-level custom overrides first, then falls back to role default.
 */
export function checkUserPermission(
  user: UserProfile | null | undefined, 
  resource: ResourceType, 
  action: ActionType
): boolean {
  if (!user) return false;
  if (user.roleId === 'super_admin') return true;

  const permKey = `${resource}.${action}`;

  // Check custom override if present
  if (user.permissionsOverride && typeof user.permissionsOverride[permKey] === 'boolean') {
    return user.permissionsOverride[permKey];
  }

  // Fall back to role default
  const effectiveRoleId = user.roleId || (user.role === 'volunteer' ? 'volunteer' : 'staff_manager');
  const roleDef = ROLE_DEFINITIONS[effectiveRoleId] || ROLE_DEFINITIONS.volunteer;
  return !!roleDef.defaultPermissions[permKey];
}

/**
 * Standardized Permissions Check Utility
 * Provides clean semantic predicates across components and services.
 */
export const Permissions = {
  /**
   * Evaluates if a user can perform an action on a resource.
   */
  check: (user: UserProfile | null | undefined, resource: ResourceType, action: ActionType): boolean => {
    return checkUserPermission(user, resource, action);
  },

  /**
   * Dot-notation or resource/action evaluation: can(user, 'people.view') or can(user, 'create', 'programs')
   */
  can: (user: UserProfile | null | undefined, actionOrKey: ActionType | string, resource?: ResourceType): boolean => {
    if (!resource && typeof actionOrKey === 'string' && actionOrKey.includes('.')) {
      const [res, act] = actionOrKey.split('.') as [ResourceType, ActionType];
      return checkUserPermission(user, res, act);
    }
    return checkUserPermission(user, resource!, actionOrKey as ActionType);
  },

  hasRole: (user: UserProfile | null | undefined, roleId: RoleId): boolean => {
    if (!user) return false;
    return user.roleId === roleId;
  },

  canAccessProgram: (user: UserProfile | null | undefined, programId: string): boolean => {
    if (!user) return false;
    if (user.roleId === 'super_admin') return true;
    if (user.dataScope.programs === 'ALL') return true;
    return (user.assignedProgramIds || []).includes(programId);
  },

  canAccessEvent: (user: UserProfile | null | undefined, eventId: string): boolean => {
    if (!user) return false;
    if (user.roleId === 'super_admin') return true;
    if (user.dataScope.events === 'ALL') return true;
    return (user.assignedEventIds || []).includes(eventId);
  },

  canView: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'view');
  },

  canCreate: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'create');
  },

  canEdit: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'edit');
  },

  canDelete: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'delete');
  },

  canExport: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'export');
  },

  canImport: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'import');
  },

  canAssign: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'assign');
  },

  canManage: (user: UserProfile | null | undefined, resource: ResourceType): boolean => {
    return checkUserPermission(user, resource, 'manage');
  },

  /**
   * Check if user meets minimum role hierarchy level:
   * Level 1 = Super Admin, 2 = Staff Manager, 3 = Staff Member, 4 = Volunteer
   */
  hasMinRole: (user: UserProfile | null | undefined, minRoleId: RoleId): boolean => {
    if (!user) return false;
    const targetDef = ROLE_DEFINITIONS[minRoleId];
    const userRoleDef = ROLE_DEFINITIONS[user.roleId || (user.role === 'volunteer' ? 'volunteer' : 'staff_manager')];
    if (!targetDef || !userRoleDef) return false;
    return userRoleDef.level <= targetDef.level;
  },

  getRoleDefinition: (roleId: RoleId): RoleDefinition => {
    return ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.volunteer;
  },

  /**
   * Generates a clear, user-friendly explanation when an action is restricted.
   */
  getDisabledReason: (user: UserProfile | null | undefined, resource: ResourceType, action: ActionType): string => {
    if (!user) return 'You must be signed in to perform this action.';
    const allowed = checkUserPermission(user, resource, action);
    if (allowed) return '';

    const roleName = ROLE_DEFINITIONS[user.roleId]?.name || 'Your current role';
    const actionLabel = action === 'delete' ? 'Delete records' :
      action === 'create' ? `Create new ${resource}` :
      action === 'export' ? `Export ${resource} data` :
      action === 'edit' ? `Edit ${resource}` :
      action === 'assign' ? 'Assign tasks to other team members' :
      action === 'manage' ? `Manage ${resource}` :
      `${action} ${resource}`;

    if (action === 'delete') {
      return `Restricted: Only Super Admins are authorized to delete ${resource}.`;
    }
    if (action === 'create' && resource === 'funding') {
      return 'Restricted: Only Super Admins can log or allocate funding records.';
    }
    if (action === 'create' && resource === 'programs') {
      return 'Restricted: Program creation requires Staff Manager or Super Admin role.';
    }
    if (action === 'assign') {
      return 'Restricted: Assigning tasks to others requires Staff Manager or Super Admin role.';
    }
    if (action === 'export' || action === 'import') {
      return 'Restricted: Data import and export is restricted to Staff Managers and Super Admins.';
    }

    return `Action not permitted for ${roleName}. Contact an administrator for elevated access.`;
  }
};

/**
 * Filter people based on user's data scope:
 * - GLOBAL: all people
 * - ASSIGNED: only people who participate in assigned programs or events
 */
export function filterPeopleByScope(
  people: Person[], 
  user: UserProfile | null | undefined
): Person[] {
  if (!people || !Array.isArray(people)) return [];
  if (!user) return people;

  const peopleScope = user.dataScope?.people || (user.roleId === 'volunteer' || user.role === 'volunteer' ? 'ASSIGNED' : 'GLOBAL');
  if (user.roleId === 'super_admin' || peopleScope === 'GLOBAL') {
    return people;
  }

  const assignedPrograms = user.assignedProgramIds || [];
  const assignedEvents = user.assignedEventIds || [];

  return people.filter(p => {
    const inProgram = p.programIds?.some(id => assignedPrograms.includes(id));
    const inEvent = p.eventIds?.some(id => assignedEvents.includes(id));
    return inProgram || inEvent;
  });
}

/**
 * Filter programs based on user's data scope:
 * - ALL: all programs
 * - ASSIGNED: programs where user is owner or listed in assignedProgramIds
 */
export function filterProgramsByScope(
  programs: Program[], 
  user: UserProfile | null | undefined
): Program[] {
  if (!programs || !Array.isArray(programs)) return [];
  if (!user) return programs;

  const programsScope = user.dataScope?.programs || (user.roleId === 'volunteer' || user.role === 'volunteer' ? 'ASSIGNED' : 'ALL');
  if (user.roleId === 'super_admin' || programsScope === 'ALL') {
    return programs;
  }

  const assigned = user.assignedProgramIds || [];
  return programs.filter(p => 
    assigned.includes(p.id) || 
    p.ownerName === user.name ||
    p.ownerEmail === user.email
  );
}

/**
 * Filter events based on user's data scope:
 * - ALL: all events
 * - ASSIGNED: events assigned directly or tied to assigned programs
 */
export function filterEventsByScope(
  events: EventItem[], 
  user: UserProfile | null | undefined
): EventItem[] {
  if (!events || !Array.isArray(events)) return [];
  if (!user) return events;

  const eventsScope = user.dataScope?.events || (user.roleId === 'volunteer' || user.role === 'volunteer' ? 'ASSIGNED' : 'ALL');
  if (user.roleId === 'super_admin' || eventsScope === 'ALL') {
    return events;
  }

  const assignedEvents = user.assignedEventIds || [];
  const assignedPrograms = user.assignedProgramIds || [];

  return events.filter(e => 
    assignedEvents.includes(e.id) || 
    (e.programId && assignedPrograms.includes(e.programId)) ||
    (e.facilitator && user.name && e.facilitator.toLowerCase().includes(user.name.toLowerCase()))
  );
}

/**
 * Filter tasks based on user's data scope:
 * - Volunteers see only their assigned tasks
 * - Staff members see their assigned tasks and tasks related to their assigned programs
 * - Super admin and staff managers see all tasks
 */
export function filterTasksByScope(
  tasks: TaskItem[], 
  user: UserProfile | null | undefined
): TaskItem[] {
  if (!tasks || !Array.isArray(tasks)) return [];
  if (!user) return tasks;

  if (user.roleId === 'super_admin' || user.roleId === 'staff_manager') {
    return tasks;
  }

  const assignedPrograms = user.assignedProgramIds || [];
  const assignedEvents = user.assignedEventIds || [];

  return tasks.filter(t => {
    const isAssignee = t.assignedToId && t.assignedToId === user.id;
    const isPostMatch = t.assignedPostId && user.postId && t.assignedPostId === user.postId;
    const isOwner = (user.name && t.owner?.toLowerCase() === user.name?.toLowerCase()) || 
      (user.roleId === 'volunteer' && t.owner?.toLowerCase().includes('volunteer'));
    const isProgramTask = (t.programId && assignedPrograms.includes(t.programId)) || 
      (t.relatedRecordType === 'Program' && t.relatedRecordId && assignedPrograms.includes(t.relatedRecordId));
    const isEventTask = (t.eventId && assignedEvents.includes(t.eventId)) || 
      (t.relatedRecordType === 'Event' && t.relatedRecordId && assignedEvents.includes(t.relatedRecordId));
    return isAssignee || isPostMatch || isOwner || isProgramTask || isEventTask;
  });
}

/**
 * Authorization Middleware Engine (Section 22)
 * Enforces the 8-step security verification rule:
 * 1. Authenticate user
 * 2. Load application user
 * 3. Verify status == 'approved'
 * 4. Verify active flag (is_active == true)
 * 5. Load role
 * 6. Verify permission
 * 7. Verify data scope
 * 8. Continue request (or return 401/403 with exact reason)
 */
export interface AuthorizationResult {
  authorized: boolean;
  statusCode: 200 | 401 | 403;
  reason?: string;
  step: string;
}

export function authorizeRequest(params: {
  user: UserProfile | null | undefined;
  resource: ResourceType;
  action: ActionType;
  programId?: string;
  eventId?: string;
}): AuthorizationResult {
  // Step 1: Authenticate user
  if (!params.user) {
    return {
      authorized: false,
      statusCode: 401,
      reason: 'Authentication required. No active identity session found.',
      step: '1. Authenticate user'
    };
  }

  const user = params.user;

  // Step 2 & 3: Load application user & verify status == 'approved'
  if (user.status === 'pending') {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Account access is pending administrator approval.',
      step: '3. Verify status (pending)'
    };
  }
  if (user.status === 'rejected') {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Access request was not approved by a TIP administrator.',
      step: '3. Verify status (rejected)'
    };
  }
  if (user.status === 'disabled' || user.status === 'suspended') {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Your TIP CRM access has been disabled.',
      step: '3. Verify status (disabled)'
    };
  }
  if (user.status !== 'approved') {
    return {
      authorized: false,
      statusCode: 403,
      reason: `Account status is "${user.status}". Approval is required.`,
      step: '3. Verify status'
    };
  }

  // Step 4: Verify active flag
  if (!user.isActive) {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Account is marked inactive.',
      step: '4. Verify active flag'
    };
  }

  // Step 5 & 6: Load role & verify permission
  const permitted = checkUserPermission(user, params.resource, params.action);
  if (!permitted) {
    return {
      authorized: false,
      statusCode: 403,
      reason: `Permission denied: Role "${ROLE_DEFINITIONS[user.roleId]?.name}" lacks permission "${params.resource}.${params.action}".`,
      step: '6. Verify permission'
    };
  }

  // Step 7: Verify data scope
  if (user.roleId !== 'super_admin') {
    if (params.resource === 'funding' && user.dataScope.funding === 'NONE') {
      return {
        authorized: false,
        statusCode: 403,
        reason: 'Funding access is forbidden under assigned data scope.',
        step: '7. Verify data scope (funding)'
      };
    }

    if (params.resource === 'programs' && params.programId) {
      const allowed = user.dataScope.programs === 'ALL' || (user.assignedProgramIds || []).includes(params.programId);
      if (!allowed) {
        return {
          authorized: false,
          statusCode: 403,
          reason: `Program "${params.programId}" is not within user's assigned programs scope.`,
          step: '7. Verify data scope (programs)'
        };
      }
    }

    if (params.resource === 'events' && params.eventId) {
      const allowed = user.dataScope.events === 'ALL' || (user.assignedEventIds || []).includes(params.eventId);
      if (!allowed) {
        return {
          authorized: false,
          statusCode: 403,
          reason: `Event "${params.eventId}" is not within user's assigned events scope.`,
          step: '7. Verify data scope (events)'
        };
      }
    }
  }

  // Step 8: Authorization successful
  return {
    authorized: true,
    statusCode: 200,
    step: '8. Continue request'
  };
}
