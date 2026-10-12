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

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    name: 'Administrator',
    level: 1,
    levelLabel: 'Level 1 — Administrator',
    description: 'Full authority layer: controls users, security, permissions, data scopes, audit logs, and all records.',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    defaultDataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'ALL'
    },
    defaultPermissions: {
      'people.view': true,
      'people.create': true,
      'people.edit': true,
      'people.delete': true,
      'people.export': true,
      'people.import': true,
      'organizations.view': true,
      'organizations.create': true,
      'organizations.edit': true,
      'organizations.delete': true,
      'programs.view': true,
      'programs.create': true,
      'programs.edit': true,
      'programs.delete': true,
      'projects.view': true,
      'projects.create': true,
      'projects.edit': true,
      'projects.delete': true,
      'projects.export': true,
      'events.view': true,
      'events.create': true,
      'events.edit': true,
      'events.delete': true,
      'participants.view': true,
      'participants.create': true,
      'participants.edit': true,
      'participants.delete': true,
      'tasks.view': true,
      'tasks.create': true,
      'tasks.edit': true,
      'tasks.delete': true,
      'tasks.assign': true,
      'interactions.view': true,
      'interactions.create': true,
      'interactions.edit': true,
      'funding.view': true,
      'funding.create': true,
      'funding.edit': true,
      'funding.delete': true,
      'reports.view': true,
      'reports.export': true,
      'documents.view': true,
      'documents.create': true,
      'documents.delete': true,
      'users.view': true,
      'users.create': true,
      'users.edit': true,
      'users.delete': true,
      'users.manage': true,
      'settings.view': true,
      'settings.edit': true,
      'settings.manage': true,
      'integrations.manage': true,
      'audit_logs.view': true,
      'intelligence.view': true,
      'intelligence.create': true,
      'intelligence.manage': true,
      'intelligence.export': true
    }
  },

  staff_manager: {
    id: 'staff_manager',
    name: 'Staff / Project User (Lead)',
    level: 2,
    levelLabel: 'Level 2 — Staff / Project User (Lead)',
    description: 'Operations management: oversees organizational records, manages programs & projects, assigns tasks, views reports and funding.',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
    defaultDataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'VIEW'
    },
    defaultPermissions: {
      'people.view': true,
      'people.create': true,
      'people.edit': true,
      'people.delete': false,
      'people.export': true,
      'people.import': true,
      'organizations.view': true,
      'organizations.create': true,
      'organizations.edit': true,
      'organizations.delete': false,
      'programs.view': true,
      'programs.create': true,
      'programs.edit': true,
      'programs.delete': false,
      'projects.view': true,
      'projects.create': true,
      'projects.edit': true,
      'projects.delete': false,
      'projects.export': true,
      'events.view': true,
      'events.create': true,
      'events.edit': true,
      'events.delete': false,
      'participants.view': true,
      'participants.create': true,
      'participants.edit': true,
      'participants.delete': false,
      'tasks.view': true,
      'tasks.create': true,
      'tasks.edit': true,
      'tasks.delete': true,
      'tasks.assign': true,
      'interactions.view': true,
      'interactions.create': true,
      'interactions.edit': true,
      'funding.view': true,
      'funding.create': false,
      'funding.edit': false,
      'funding.delete': false,
      'reports.view': true,
      'reports.export': true,
      'documents.view': true,
      'documents.create': true,
      'documents.delete': false,
      'users.view': true,
      'users.create': false,
      'users.edit': false,
      'users.delete': false,
      'users.manage': false,
      'settings.view': true,
      'settings.edit': false,
      'settings.manage': false,
      'integrations.manage': false,
      'audit_logs.view': true,
      'intelligence.view': true,
      'intelligence.create': true,
      'intelligence.manage': false,
      'intelligence.export': true
    }
  },

  staff_member: {
    id: 'staff_member',
    name: 'Staff / Project User',
    level: 3,
    levelLabel: 'Level 3 — Staff / Project User',
    description: 'Frontline staff: manages assigned programs & projects, events, community interactions, and follow-ups.',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    defaultDataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    defaultPermissions: {
      'people.view': true,
      'people.create': true,
      'people.edit': true,
      'people.delete': false,
      'people.export': false,
      'people.import': false,
      'organizations.view': true,
      'organizations.create': true,
      'organizations.edit': false,
      'organizations.delete': false,
      'programs.view': true,
      'programs.create': false,
      'programs.edit': true,
      'programs.delete': false,
      'projects.view': true,
      'projects.create': true,
      'projects.edit': true,
      'projects.delete': false,
      'projects.export': false,
      'events.view': true,
      'events.create': true,
      'events.edit': true,
      'events.delete': false,
      'participants.view': true,
      'participants.create': true,
      'participants.edit': true,
      'participants.delete': false,
      'tasks.view': true,
      'tasks.create': true,
      'tasks.edit': true,
      'tasks.delete': false,
      'tasks.assign': false,
      'interactions.view': true,
      'interactions.create': true,
      'interactions.edit': true,
      'funding.view': false,
      'funding.create': false,
      'funding.edit': false,
      'funding.delete': false,
      'reports.view': true,
      'reports.export': false,
      'documents.view': true,
      'documents.create': true,
      'documents.delete': false,
      'users.view': false,
      'users.create': false,
      'users.edit': false,
      'users.delete': false,
      'users.manage': false,
      'settings.view': false,
      'settings.edit': false,
      'settings.manage': false,
      'integrations.manage': false,
      'audit_logs.view': false,
      'intelligence.view': true,
      'intelligence.create': true,
      'intelligence.manage': false,
      'intelligence.export': true
    }
  },

  volunteer: {
    id: 'volunteer',
    name: 'Limited User',
    level: 4,
    levelLabel: 'Level 4 — Limited User',
    description: 'Restricted role: access controlled by Administrator. Can be granted specific permissions and data scopes across people, programs, projects, events, tasks, or documents.',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    defaultDataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    defaultPermissions: {
      'people.view': true,
      'people.create': false,
      'people.edit': false,
      'people.delete': false,
      'people.export': false,
      'people.import': false,
      'organizations.view': false,
      'organizations.create': false,
      'organizations.edit': false,
      'organizations.delete': false,
      'programs.view': true,
      'programs.create': false,
      'programs.edit': false,
      'programs.delete': false,
      'projects.view': true,
      'projects.create': false,
      'projects.edit': false,
      'projects.delete': false,
      'events.view': true,
      'events.create': false,
      'events.edit': false,
      'events.delete': false,
      'participants.view': true,
      'participants.create': false,
      'participants.edit': true, // Attendance check-in
      'participants.delete': false,
      'tasks.view': true,
      'tasks.create': true,
      'tasks.edit': true,
      'tasks.delete': false,
      'tasks.assign': false,
      'interactions.view': true,
      'interactions.create': true,
      'interactions.edit': false,
      'funding.view': false,
      'funding.create': false,
      'funding.edit': false,
      'funding.delete': false,
      'reports.view': false,
      'reports.export': false,
      'documents.view': true,
      'documents.create': false,
      'documents.delete': false,
      'users.view': false,
      'users.create': false,
      'users.edit': false,
      'users.delete': false,
      'users.manage': false,
      'settings.view': false,
      'settings.edit': false,
      'settings.manage': false,
      'integrations.manage': false,
      'audit_logs.view': false,
      'intelligence.view': true,
      'intelligence.create': false,
      'intelligence.manage': false,
      'intelligence.export': false
    }
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
    defaultPermissions: {
      'people.view': true,
      'people.create': true,
      'people.edit': true,
      'people.delete': false,
      'people.export': false,
      'people.import': false,
      'organizations.view': true,
      'organizations.create': true,
      'organizations.edit': false,
      'organizations.delete': false,
      'programs.view': true,
      'programs.create': true,
      'programs.edit': true,
      'programs.delete': false,
      'projects.view': true,
      'projects.create': true,
      'projects.edit': true,
      'projects.delete': false,
      'events.view': true,
      'events.create': true,
      'events.edit': true,
      'events.delete': false,
      'participants.view': true,
      'participants.create': true,
      'participants.edit': true,
      'participants.delete': false,
      'tasks.view': true,
      'tasks.create': true,
      'tasks.edit': true,
      'tasks.delete': false,
      'tasks.assign': true,
      'interactions.view': true,
      'interactions.create': true,
      'interactions.edit': true,
      'funding.view': false,
      'funding.create': false,
      'funding.edit': false,
      'funding.delete': false,
      'reports.view': true,
      'reports.export': false,
      'documents.view': true,
      'documents.create': true,
      'documents.delete': false,
      'users.view': false,
      'users.create': false,
      'users.edit': false,
      'users.delete': false,
      'users.manage': false,
      'settings.view': false,
      'settings.edit': false,
      'settings.manage': false,
      'integrations.manage': false,
      'audit_logs.view': false,
      'intelligence.view': true,
      'intelligence.create': true,
      'intelligence.manage': false,
      'intelligence.export': true
    }
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
    defaultPermissions: {
      'people.view': true,
      'people.create': true,
      'people.edit': true,
      'people.delete': false,
      'people.export': false,
      'people.import': false,
      'organizations.view': true,
      'organizations.create': false,
      'organizations.edit': false,
      'organizations.delete': false,
      'programs.view': true,
      'programs.create': false,
      'programs.edit': false,
      'programs.delete': false,
      'projects.view': true,
      'projects.create': false,
      'projects.edit': false,
      'projects.delete': false,
      'events.view': true,
      'events.create': true,
      'events.edit': true,
      'events.delete': false,
      'participants.view': true,
      'participants.create': true,
      'participants.edit': true, // Attendance check-in
      'participants.delete': false,
      'tasks.view': true,
      'tasks.create': true,
      'tasks.edit': true,
      'tasks.delete': false,
      'tasks.assign': true,
      'interactions.view': true,
      'interactions.create': true,
      'interactions.edit': true,
      'funding.view': false,
      'funding.create': false,
      'funding.edit': false,
      'funding.delete': false,
      'reports.view': true,
      'reports.export': false,
      'documents.view': true,
      'documents.create': true,
      'documents.delete': false,
      'users.view': false,
      'users.create': false,
      'users.edit': false,
      'users.delete': false,
      'users.manage': false,
      'settings.view': false,
      'settings.edit': false,
      'settings.manage': false,
      'integrations.manage': false,
      'audit_logs.view': false,
      'intelligence.view': true,
      'intelligence.create': true,
      'intelligence.manage': false,
      'intelligence.export': true
    }
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

