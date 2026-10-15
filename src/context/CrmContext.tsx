import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Person, 
  Organization, 
  Program, 
  EventItem, 
  ParticipantRecord, 
  TaskItem, 
  FundingRecord, 
  InteractionItem, 
  DocumentItem, 
  AuditLogItem, 
  UserProfile,
  UserRole,
  RoleId,
  ResourceType,
  ActionType,
  ParticipantStatus,
  TaskStatus,
  AuthSession,
  AuthState,
  AccessRequest,
  UserAccountStatus,
  UserDataScope,
  Post,
  PostResponsibility,
  TaskTemplate,
  TaskAssignmentRule,
  TaskAssignmentRecord,
  TaskActivityRecord,
  TaskTriggerType,
  TaskAssignmentMode,
  AiSuggestion,
  AiBehaviorSnapshot,
  AiConversation,
  AiMessage,
  AiUserSettings,
  AiActionRecord,
  AiActionPreview,
  AiSuggestionStatus,
  AiBudgetConfig
} from '../types';
import { 
  checkUserPermission, 
  filterPeopleByScope, 
  filterProgramsByScope, 
  filterEventsByScope, 
  filterTasksByScope,
  ROLE_DEFINITIONS,
  RoleDefinition,
  Permissions as PermissionsLib
} from '../lib/permissions';
import { 
  INITIAL_USERS, 
  INITIAL_PEOPLE, 
  INITIAL_ORGANIZATIONS, 
  INITIAL_PROGRAMS, 
  INITIAL_EVENTS, 
  INITIAL_PARTICIPANTS, 
  INITIAL_TASKS, 
  INITIAL_FUNDING, 
  INITIAL_INTERACTIONS, 
  INITIAL_DOCUMENTS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_ACCESS_REQUESTS,
  INITIAL_POSTS,
  INITIAL_POST_RESPONSIBILITIES,
  INITIAL_TASK_TEMPLATES,
  INITIAL_TASK_ASSIGNMENT_RULES,
  INITIAL_TASK_ASSIGNMENTS,
  INITIAL_TASK_ACTIVITY,
  INITIAL_AI_SUGGESTIONS,
  INITIAL_BEHAVIOR_SNAPSHOTS,
  INITIAL_AI_CONVERSATIONS,
  INITIAL_AI_MESSAGES,
  INITIAL_AI_USER_SETTINGS
} from '../data/mockData';
import { SupabaseAuthEngine } from '../lib/supabase';
import { clientSafeLogger, mapToSafeErrorMessage } from '../lib/safeErrors';
import { 
  calculateUserBehaviorSnapshot, 
  calculateOrgBehaviorSnapshot, 
  detectWorkPatterns 
} from '../lib/workBehaviorEngine';
import { 
  sendIntelligenceQuery, 
  confirmAiActionOnServer 
} from '../lib/tipIntelligenceService';
import { updateAiBudget } from '../lib/aiOrchestrator';
import { validateBackupStructure } from '../lib/fileValidation';
import { cacheResource, clearUserOfflineCache } from '../lib/offlineStorage';
import { 
  DatabaseHealthService, 
  DatabaseReadinessReport,
  PeopleService, 
  OrganizationsService, 
  ProgramsService, 
  EventsService, 
  TasksService, 
  FundingService,
  DocumentsService 
} from '../lib/services';
import { syncEngine } from '../lib/syncEngine';

export interface PermissionsUtility {
  can: (action: ActionType, resource: ResourceType) => boolean;
  check: (resource: ResourceType, action: ActionType) => boolean;
  canView: (resource: ResourceType) => boolean;
  canCreate: (resource: ResourceType) => boolean;
  canEdit: (resource: ResourceType) => boolean;
  canDelete: (resource: ResourceType) => boolean;
  canExport: (resource: ResourceType) => boolean;
  canImport: (resource: ResourceType) => boolean;
  canAssign: (resource: ResourceType) => boolean;
  canManage: (resource: ResourceType) => boolean;
  isAtLeast: (minRole: RoleId) => boolean;
  getDisabledReason: (resource: ResourceType, action: ActionType) => string;
}

interface CrmContextType {
  // Authentication & Session State (Optional)
  authSession?: AuthSession | null;
  authState?: AuthState;
  loginWithGoogle?: (customEmail?: string, customName?: string) => Promise<void>;
  loginWithEmailPassword?: (email: string, pass: string) => Promise<void>;
  signUpWithEmailPassword?: (email: string, pass: string, fullName: string) => Promise<void>;
  logout?: () => Promise<void>;
  requestAccess?: (notes?: string, customName?: string) => Promise<void>;

  // Access Requests Workflow
  accessRequests?: AccessRequest[];
  pendingRequestsCount?: number;
  approveAccessRequest?: (
    requestId: string,
    roleId: RoleId,
    dataScopePeople: 'GLOBAL' | 'ORGANIZATION' | 'ASSIGNED' | 'OWN_RECORD',
    programIds: string[],
    eventIds: string[]
  ) => void;
  rejectAccessRequest?: (requestId: string, reason?: string) => void;
  setUserAccountStatus?: (userId: string, status: UserAccountStatus, reason?: string) => void;
  updateUserRoleAndScope?: (
    userId: string,
    roleId: RoleId,
    dataScope: UserDataScope,
    assignedPrograms: string[],
    assignedEvents: string[]
  ) => void;

  users: UserProfile[];
  currentUser: UserProfile;
  switchUser: (userId: string) => void;
  switchUserRole: (roleId: RoleId) => void;
  switchActiveRole: (roleId: RoleId) => Promise<boolean>;
  completeFirstLoginPasswordChange: (currentTempPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: () => Promise<void>;
  adminProvisionUser: (params: {
    name: string;
    email: string;
    postId?: string;
    assignedRoleIds: RoleId[];
    assignedProgramIds: string[];
    assignedEventIds: string[];
    tempPassword?: string;
    sendInviteEmail?: boolean;
  }) => Promise<UserProfile>;
  adminResetUserPassword: (userId: string, customTempPassword?: string) => Promise<{ tempPassword: string }>;
  setUserRole: (role: UserRole) => void;
  addUser: (user: Omit<UserProfile, 'id' | 'createdAt'>) => UserProfile;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  
  // User Role State
  userRole: UserRole;
  currentRoleId: RoleId;
  roleLevel: number;
  roleDefinition: RoleDefinition;
  roleBadge: { text: string; bg: string; label: string };

  // Role hierarchy boolean checks
  isSuperAdmin: boolean;
  isStaffManager: boolean;
  isStaffMember: boolean;
  isVolunteer: boolean;

  // Specific high-level capability flags
  canViewFunding: boolean;
  canCreateFunding: boolean;
  canManageUsers: boolean;
  canExportReports: boolean;
  canDeleteRecords: boolean;
  canImportData: boolean;
  
  // Permissions Check Utility
  Permissions: PermissionsUtility;
  hasPermission: (resource: ResourceType, action: ActionType) => boolean;
  
  // Data Scope Enforced Records
  scopedPeople: Person[];
  scopedPrograms: Program[];
  scopedEvents: EventItem[];
  scopedTasks: TaskItem[];
  
  // Raw records (available for super admins / calculations)
  people: Person[];
  organizations: Organization[];
  programs: Program[];
  events: EventItem[];
  participants: ParticipantRecord[];
  tasks: TaskItem[];
  funding: FundingRecord[];
  interactions: InteractionItem[];
  documents: DocumentItem[];
  auditLogs: AuditLogItem[];
  logAudit: (action: string, entityType: string, entityName: string, details?: string) => void;
  
  // Person CRUD
  addPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Person;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  
  // Org CRUD
  addOrganization: (org: Omit<Organization, 'id' | 'createdAt'>) => Organization;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;
  
  // Program CRUD
  addProgram: (prog: Omit<Program, 'id' | 'createdAt'>) => Program;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  
  // Event CRUD
  addEvent: (evt: Omit<EventItem, 'id' | 'createdAt'>) => EventItem;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
  
  // Attendance & Participant
  updateParticipantStatus: (id: string, status: ParticipantStatus) => void;
  addParticipant: (participant: Omit<ParticipantRecord, 'id' | 'registeredAt'>) => void;
  
  // Tasks
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => TaskItem;
  toggleTaskStatus: (id: string) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  approveSuggestedTask: (taskId: string, confirmedAssigneeId?: string) => void;
  rejectSuggestedTask: (taskId: string) => void;
  assignTask: (taskId: string, userId: string, postId?: string) => void;
  reassignTask: (taskId: string, newUserId: string, reason?: string) => void;

  // Post & Responsibility Model
  posts: Post[];
  postResponsibilities: PostResponsibility[];
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => Post;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  addPostResponsibility: (resp: Omit<PostResponsibility, 'id'>) => PostResponsibility;
  deletePostResponsibility: (id: string) => void;

  // Task Templates & Rules Engine
  taskTemplates: TaskTemplate[];
  taskRules: TaskAssignmentRule[];
  taskAssignments: TaskAssignmentRecord[];
  taskActivity: TaskActivityRecord[];
  addTaskTemplate: (tpl: Omit<TaskTemplate, 'id' | 'createdAt'>) => TaskTemplate;
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTaskTemplate: (id: string) => void;
  addTaskRule: (rule: Omit<TaskAssignmentRule, 'id' | 'createdAt'>) => TaskAssignmentRule;
  updateTaskRule: (id: string, updates: Partial<TaskAssignmentRule>) => void;
  deleteTaskRule: (id: string) => void;
  executeRulesForTrigger: (triggerType: TaskTriggerType, context: Record<string, any>) => TaskItem[];
  
  // Funding
  addFunding: (funding: Omit<FundingRecord, 'id' | 'createdAt'>) => FundingRecord;
  updateFunding: (id: string, updates: Partial<FundingRecord>) => void;
  deleteFunding: (id: string) => void;
  
  // Interactions
  addInteraction: (interaction: Omit<InteractionItem, 'id' | 'createdAt'>) => InteractionItem;
  
  // Documents
  addDocument: (doc: Omit<DocumentItem, 'id' | 'addedAt'>) => DocumentItem;
  deleteDocument: (id: string) => void;

  // Sovereign Data & Backup Restoration
  restoreDatabaseFromBackup: (backupData: any) => {
    success: boolean;
    error?: string;
    restoredCounts?: Record<string, number>;
  };
  
  // Import
  batchImportPeople: (imported: Array<{
    name: string;
    email: string;
    role?: string;
    organizationName?: string;
    relationshipTypes: string[];
    phone?: string;
    interests?: string[];
  }>) => { addedCount: number; duplicateCount: number };

  // TIP Intelligence
  aiSuggestions: AiSuggestion[];
  aiConversations: AiConversation[];
  aiMessages: AiMessage[];
  aiBehaviorSnapshots: AiBehaviorSnapshot[];
  aiUserSettings: AiUserSettings;
  aiBudgetConfig: AiBudgetConfig;
  updateAiBudgetConfig: (config: Partial<AiBudgetConfig>) => Promise<void>;
  aiDataVersion: number;
  incrementAiDataVersion: () => void;
  activeAiConversationId: string;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  setActiveAiConversationId: (id: string) => void;
  updateSuggestionStatus: (id: string, status: AiSuggestionStatus) => void;
  recordSuggestionFeedback: (id: string, feedback: 'useful' | 'not_useful') => void;
  sendIntelligenceMessage: (content: string, conversationId?: string, context?: any) => Promise<AiMessage>;
  executeAiAction: (actionPreview: AiActionPreview) => Promise<{ success: boolean; message: string }>;
  updateAiUserSettings: (settings: Partial<AiUserSettings>) => void;
  refreshAiSuggestions: () => void;
  pendingActionPreview: AiActionPreview | null;
  setPendingActionPreview: (preview: AiActionPreview | null) => void;
  
  // Reset demo data
  resetAllData: () => void;

  // Supabase Database Connection & Readiness
  databaseReadiness: DatabaseReadinessReport | null;
  refreshDatabaseReadiness: (forceRefresh?: boolean) => Promise<DatabaseReadinessReport>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'tip_crm_v2_';

// Automatically purge stale v1 demo data from client localStorage
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const legacyKeys = Object.keys(localStorage).filter(k => k.startsWith('tip_crm_v1_'));
    if (legacyKeys.length > 0) {
      legacyKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (_) {}
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    clientSafeLogger.error(`Error reading localStorage for key: ${key}`, mapToSafeErrorMessage(e));
    return fallback;
  }
}

function normalizeUser(rawUser: any): UserProfile {
  if (!rawUser || typeof rawUser !== 'object') {
    return { ...INITIAL_USERS[0] };
  }

  // Check if this profile belongs to Pritam Biswas
  const isPritam = rawUser.id === 'u-1' || 
                   rawUser.name === 'Pritam Biswas' || 
                   (typeof rawUser.name === 'string' && rawUser.name.toLowerCase().includes('pritam')) ||
                   rawUser.email === 'pritam@gmail.com' || 
                   rawUser.email === 'pritamb2k06@gmail.com';

  // Determine roleId with backward compatibility - Pritam is ALWAYS Super Admin!
  const baseRoleId: RoleId = isPritam ? 'super_admin' : (rawUser.roleId || (rawUser.role === 'volunteer' ? 'volunteer' : 'staff_member'));
  const assignedRoleIds: RoleId[] = isPritam 
    ? ['super_admin'] 
    : (Array.isArray(rawUser.assignedRoleIds) && rawUser.assignedRoleIds.length > 0 ? rawUser.assignedRoleIds : [baseRoleId]);
  const activeRoleId: RoleId = isPritam 
    ? 'super_admin' 
    : ((rawUser.activeRoleId && assignedRoleIds.includes(rawUser.activeRoleId)) ? rawUser.activeRoleId : (assignedRoleIds[0] || baseRoleId));
  const roleDef = ROLE_DEFINITIONS[activeRoleId] || ROLE_DEFINITIONS.super_admin;

  return {
    id: isPritam ? 'u-1' : (rawUser.id || 'u-' + Date.now()),
    authUserId: rawUser.authUserId,
    organizationId: rawUser.organizationId || 'org-tip',
    name: isPritam ? 'Pritam Biswas' : (rawUser.name || 'Staff User'),
    email: isPritam ? (rawUser.email || 'pritam@gmail.com') : (rawUser.email || 'user@theinclusionproject.ca'),
    phone: rawUser.phone,
    role: isPritam ? 'staff' : (activeRoleId === 'volunteer' ? 'volunteer' : 'staff'),
    roleId: activeRoleId,
    assignedRoleIds,
    activeRoleId,
    title: isPritam ? 'Executive Director & Super Admin' : (rawUser.title || roleDef.name),
    avatarInitials: isPritam ? 'PB' : (rawUser.avatarInitials || (rawUser.name ? rawUser.name.slice(0, 2).toUpperCase() : 'SU')),
    status: isPritam ? 'approved' : (rawUser.status || 'approved'),
    isActive: isPritam ? true : (rawUser.isActive !== undefined ? rawUser.isActive : true),
    emailVerified: isPritam ? true : (rawUser.emailVerified !== undefined ? rawUser.emailVerified : true),
    adminApproved: isPritam ? true : (rawUser.adminApproved !== undefined ? rawUser.adminApproved : (rawUser.status === 'approved')),
    mustChangePassword: isPritam ? false : Boolean(rawUser.mustChangePassword),
    passwordChangedAt: rawUser.passwordChangedAt,
    onboardingCompleted: isPritam ? true : (rawUser.onboardingCompleted !== undefined ? Boolean(rawUser.onboardingCompleted) : true),
    tempPassword: rawUser.tempPassword,
    passwordHash: rawUser.passwordHash,
    dataScope: isPritam ? {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'ALL'
    } : {
      people: rawUser.dataScope?.people || roleDef.defaultDataScope.people,
      programs: rawUser.dataScope?.programs || roleDef.defaultDataScope.programs,
      events: rawUser.dataScope?.events || roleDef.defaultDataScope.events,
      funding: rawUser.dataScope?.funding || roleDef.defaultDataScope.funding,
    },
    assignedProgramIds: isPritam ? ['prog-1', 'prog-2', 'prog-3'] : (Array.isArray(rawUser.assignedProgramIds) ? rawUser.assignedProgramIds : []),
    assignedEventIds: isPritam ? ['evt-1', 'evt-2', 'evt-3', 'evt-4'] : (Array.isArray(rawUser.assignedEventIds) ? rawUser.assignedEventIds : []),
    postId: isPritam ? 'post-ed' : rawUser.postId,
    postTitle: isPritam ? 'Executive Director' : rawUser.postTitle,
    responsibilities: isPritam ? [
      'Strategic leadership & organizational vision',
      'Board governance and fiduciary oversight',
      'High-impact philanthropic partnerships',
      'Team post, rule & AI orchestration configuration'
    ] : (Array.isArray(rawUser.responsibilities) ? rawUser.responsibilities : []),
    permissionsOverride: rawUser.permissionsOverride || {},
    createdAt: rawUser.createdAt || new Date().toISOString()
  };
}

const pendingSaveTimers = new Map<string, any>();
const pendingSaveValues = new Map<string, any>();

export function flushPendingCrmSaves() {
  for (const [key, val] of pendingSaveValues.entries()) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
    } catch (e) {
      clientSafeLogger.error(`Error flushing localStorage for key: ${key}`, mapToSafeErrorMessage(e));
    }
  }
  for (const timer of pendingSaveTimers.values()) {
    clearTimeout(timer);
  }
  pendingSaveTimers.clear();
  pendingSaveValues.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingCrmSaves);
  window.addEventListener('pagehide', flushPendingCrmSaves);
}

function saveToStorage<T>(key: string, value: T, immediate = false, userId?: string) {
  if (immediate) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
      if (userId) {
        cacheResource(userId, key, value).catch(() => {});
      }
    } catch (e) {
      clientSafeLogger.error(`Error writing localStorage for key: ${key}`, mapToSafeErrorMessage(e));
    }
    return;
  }

  pendingSaveValues.set(key, value);
  if (pendingSaveTimers.has(key)) {
    clearTimeout(pendingSaveTimers.get(key));
  }

  const timer = setTimeout(() => {
    pendingSaveTimers.delete(key);
    pendingSaveValues.delete(key);
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
      if (userId) {
        cacheResource(userId, key, value).catch(() => {});
      }
    } catch (e) {
      clientSafeLogger.error(`Error writing localStorage for key: ${key}`, mapToSafeErrorMessage(e));
    }
  }, 250);

  pendingSaveTimers.set(key, timer);
}

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const loaded = loadFromStorage<any[]>('crm_users', INITIAL_USERS);
    const list = Array.isArray(loaded) && loaded.length > 0 ? loaded.map(normalizeUser) : [...INITIAL_USERS];
    
    // Ensure demo seed users (such as u-8 Chloe Vance) exist in list if not already present
    INITIAL_USERS.forEach(seedUser => {
      if (!list.some(u => u.id === seedUser.id)) {
        list.push(seedUser);
      }
    });

    // Guarantee that u-1 / Pritam Biswas is always present as Super Admin
    const pritamIndex = list.findIndex(u => u.id === 'u-1' || u.name === 'Pritam Biswas' || u.email === 'pritam@gmail.com');
    if (pritamIndex >= 0) {
      list[pritamIndex] = {
        ...list[pritamIndex],
        id: 'u-1',
        name: 'Pritam Biswas',
        email: 'pritam@gmail.com',
        roleId: 'super_admin',
        role: 'staff',
        assignedRoleIds: ['super_admin'],
        activeRoleId: 'super_admin',
        title: 'Executive Director & Super Admin',
        postId: 'post-ed',
        postTitle: 'Executive Director',
        dataScope: { people: 'GLOBAL', programs: 'ALL', events: 'ALL', funding: 'ALL' },
        status: 'approved',
        isActive: true,
        emailVerified: true,
        adminApproved: true,
        mustChangePassword: false,
        onboardingCompleted: true
      };
    } else {
      list.unshift(INITIAL_USERS[0]);
    }
    return list;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const loaded = loadFromStorage<any>('current_user', null);
    if (!loaded) return INITIAL_USERS[0];
    const user = normalizeUser(loaded);
    // If the saved user is Pritam, ensure roleId is super_admin
    if (user.id === 'u-1' || user.name === 'Pritam Biswas') {
      return {
        ...user,
        roleId: 'super_admin',
        role: 'staff',
        title: 'Executive Director & Super Admin',
        dataScope: { people: 'GLOBAL', programs: 'ALL', events: 'ALL', funding: 'ALL' }
      };
    }
    return user;
  });
  
  const [people, setPeople] = useState<Person[]>(() => 
    loadFromStorage('people', INITIAL_PEOPLE)
  );
  
  const [organizations, setOrganizations] = useState<Organization[]>(() => 
    loadFromStorage('organizations', INITIAL_ORGANIZATIONS)
  );
  
  const [programs, setPrograms] = useState<Program[]>(() => 
    loadFromStorage('programs', INITIAL_PROGRAMS)
  );
  
  const [events, setEvents] = useState<EventItem[]>(() => 
    loadFromStorage('events', INITIAL_EVENTS)
  );
  
  const [participants, setParticipants] = useState<ParticipantRecord[]>(() => 
    loadFromStorage('participants', INITIAL_PARTICIPANTS)
  );
  
  const [tasks, setTasks] = useState<TaskItem[]>(() => 
    loadFromStorage('tasks', INITIAL_TASKS)
  );
  
  const [funding, setFunding] = useState<FundingRecord[]>(() => 
    loadFromStorage('funding', INITIAL_FUNDING)
  );
  
  const [interactions, setInteractions] = useState<InteractionItem[]>(() => 
    loadFromStorage('interactions', INITIAL_INTERACTIONS)
  );
  
  const [documents, setDocuments] = useState<DocumentItem[]>(() => 
    loadFromStorage('documents', INITIAL_DOCUMENTS)
  );
  
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => 
    loadFromStorage('audit_logs', INITIAL_AUDIT_LOGS)
  );

  // Four-Layer Employee Model & Post Hierarchy state
  const [posts, setPosts] = useState<Post[]>(() => 
    loadFromStorage('posts', INITIAL_POSTS)
  );

  const [postResponsibilities, setPostResponsibilities] = useState<PostResponsibility[]>(() => 
    loadFromStorage('post_responsibilities', INITIAL_POST_RESPONSIBILITIES)
  );

  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(() => 
    loadFromStorage('task_templates', INITIAL_TASK_TEMPLATES)
  );

  const [taskRules, setTaskRules] = useState<TaskAssignmentRule[]>(() => 
    loadFromStorage('task_rules', INITIAL_TASK_ASSIGNMENT_RULES)
  );

  const [taskAssignments, setTaskAssignments] = useState<TaskAssignmentRecord[]>(() => 
    loadFromStorage('task_assignments', INITIAL_TASK_ASSIGNMENTS)
  );

  const [taskActivity, setTaskActivity] = useState<TaskActivityRecord[]>(() => 
    loadFromStorage('task_activity', INITIAL_TASK_ACTIVITY)
  );

  // TIP Intelligence State
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>(() => 
    loadFromStorage('ai_suggestions', INITIAL_AI_SUGGESTIONS)
  );

  const [aiConversations, setAiConversations] = useState<AiConversation[]>(() => 
    loadFromStorage('ai_conversations', INITIAL_AI_CONVERSATIONS)
  );

  const [aiMessages, setAiMessages] = useState<AiMessage[]>(() => 
    loadFromStorage('ai_messages', INITIAL_AI_MESSAGES)
  );

  const [aiBehaviorSnapshots, setAiBehaviorSnapshots] = useState<AiBehaviorSnapshot[]>(() => 
    loadFromStorage('ai_behavior_snapshots', INITIAL_BEHAVIOR_SNAPSHOTS)
  );

  const [aiUserSettings, setAiUserSettings] = useState<AiUserSettings>(() => 
    loadFromStorage('ai_user_settings', INITIAL_AI_USER_SETTINGS)
  );

  const [aiBudgetConfig, setAiBudgetConfig] = useState<AiBudgetConfig>(() =>
    loadFromStorage<AiBudgetConfig>('ai_budget', {
      dailyRequestLimit: 50,
      monthlyRequestLimit: 1000,
      perUserLimit: 15,
      csvAnalysisLimit: 10,
      chatLimit: 25,
      reportGenLimit: 10,
      privacyMode: 'minimal'
    })
  );

  const [aiDataVersion, setAiDataVersion] = useState<number>(() =>
    loadFromStorage<number>('ai_data_version', 1)
  );

  const [dismissedSuggestionHashes, setDismissedSuggestionHashes] = useState<Record<string, string>>(() =>
    loadFromStorage<Record<string, string>>('ai_dismissed_hashes', {})
  );

  const incrementAiDataVersion = () => {
    setAiDataVersion(prev => {
      const next = prev + 1;
      saveToStorage('ai_data_version', next);
      return next;
    });
  };

  const updateAiBudgetConfig = async (newConfig: Partial<AiBudgetConfig>) => {
    setAiBudgetConfig(prev => {
      const updated = { ...prev, ...newConfig };
      saveToStorage('ai_budget', updated);
      return updated;
    });
    await updateAiBudget(newConfig);
  };

  const [activeAiConversationId, setActiveAiConversationId] = useState<string>('conv-1');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [pendingActionPreview, setPendingActionPreview] = useState<AiActionPreview | null>(null);

  // Supabase Database Readiness & Cloud Sync
  const [databaseReadiness, setDatabaseReadiness] = useState<DatabaseReadinessReport | null>(null);

  const refreshDatabaseReadiness = async (forceRefresh = true): Promise<DatabaseReadinessReport> => {
    const report = await DatabaseHealthService.checkReadiness(forceRefresh);
    setDatabaseReadiness(report);
    return report;
  };

  useEffect(() => {
    if (currentUser?.id) {
      syncEngine.setUserId(currentUser.id);
    }
    refreshDatabaseReadiness(false);
  }, [currentUser?.id]);

  useEffect(() => {
    let isMounted = true;
    async function loadCloudDataIfReady() {
      try {
        const report = await DatabaseHealthService.checkReadiness();
        if (isMounted) setDatabaseReadiness(report);
        if (report.isSchemaDeployed && isMounted) {
          const [peopleRes, orgsRes, progsRes, evtsRes, tasksRes, fundRes] = await Promise.all([
            PeopleService.getAll(),
            OrganizationsService.getAll(),
            ProgramsService.getAll(),
            EventsService.getAll(),
            TasksService.getAll(),
            FundingService.getAll()
          ]);
          if (!isMounted) return;
          if (peopleRes.data && peopleRes.data.length > 0) setPeople(peopleRes.data);
          if (orgsRes.data && orgsRes.data.length > 0) setOrganizations(orgsRes.data);
          if (progsRes.data && progsRes.data.length > 0) setPrograms(progsRes.data);
          if (evtsRes.data && evtsRes.data.length > 0) setEvents(evtsRes.data);
          if (tasksRes.data && tasksRes.data.length > 0) setTasks(tasksRes.data);
          if (fundRes.data && fundRes.data.length > 0) setFunding(fundRes.data);
        }
      } catch (err) {
        clientSafeLogger.warn('Cloud data initialization fallback to local storage:', err);
      }
    }
    loadCloudDataIfReady();
    return () => { isMounted = false; };
  }, []);

  // Sync to localStorage and IndexedDB with debounce
  useEffect(() => { saveToStorage('crm_users', users, false, currentUser?.id); }, [users, currentUser?.id]);
  useEffect(() => { saveToStorage('current_user', currentUser, true, currentUser?.id); }, [currentUser]);
  useEffect(() => { saveToStorage('people', people, false, currentUser?.id); }, [people, currentUser?.id]);
  useEffect(() => { saveToStorage('organizations', organizations, false, currentUser?.id); }, [organizations, currentUser?.id]);
  useEffect(() => { saveToStorage('programs', programs, false, currentUser?.id); }, [programs, currentUser?.id]);
  useEffect(() => { saveToStorage('events', events, false, currentUser?.id); }, [events, currentUser?.id]);
  useEffect(() => { saveToStorage('participants', participants, false, currentUser?.id); }, [participants, currentUser?.id]);
  useEffect(() => { saveToStorage('tasks', tasks, false, currentUser?.id); }, [tasks, currentUser?.id]);
  useEffect(() => { saveToStorage('funding', funding, false, currentUser?.id); }, [funding, currentUser?.id]);
  useEffect(() => { saveToStorage('interactions', interactions, false, currentUser?.id); }, [interactions, currentUser?.id]);
  useEffect(() => { saveToStorage('documents', documents, false, currentUser?.id); }, [documents, currentUser?.id]);
  useEffect(() => { saveToStorage('audit_logs', auditLogs, false, currentUser?.id); }, [auditLogs, currentUser?.id]);
  useEffect(() => { saveToStorage('posts', posts, false, currentUser?.id); }, [posts, currentUser?.id]);
  useEffect(() => { saveToStorage('post_responsibilities', postResponsibilities, false, currentUser?.id); }, [postResponsibilities, currentUser?.id]);
  useEffect(() => { saveToStorage('task_templates', taskTemplates, false, currentUser?.id); }, [taskTemplates, currentUser?.id]);
  useEffect(() => { saveToStorage('task_rules', taskRules, false, currentUser?.id); }, [taskRules, currentUser?.id]);
  useEffect(() => { saveToStorage('task_assignments', taskAssignments, false, currentUser?.id); }, [taskAssignments, currentUser?.id]);
  useEffect(() => { saveToStorage('task_activity', taskActivity, false, currentUser?.id); }, [taskActivity, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_suggestions', aiSuggestions, false, currentUser?.id); }, [aiSuggestions, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_conversations', aiConversations, false, currentUser?.id); }, [aiConversations, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_messages', aiMessages, false, currentUser?.id); }, [aiMessages, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_behavior_snapshots', aiBehaviorSnapshots, false, currentUser?.id); }, [aiBehaviorSnapshots, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_user_settings', aiUserSettings, false, currentUser?.id); }, [aiUserSettings, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_budget', aiBudgetConfig, false, currentUser?.id); }, [aiBudgetConfig, currentUser?.id]);
  useEffect(() => { saveToStorage('ai_dismissed_hashes', dismissedSuggestionHashes, false, currentUser?.id); }, [dismissedSuggestionHashes, currentUser?.id]);

  const logAction = (action: string, entityType: string, entityName: string, details?: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0] + ' ' + now.toTimeString().substring(0, 5);
    const newLog: AuditLogItem = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      action,
      entityType,
      entityName,
      userName: currentUser.name,
      timestamp: dateStr,
      details
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 49)]);

    // Check 12: Asynchronously append to authoritative server audit log
    if (typeof fetch !== 'undefined') {
      fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.roleId,
          'X-User-Name': currentUser.name
        },
        body: JSON.stringify({
          action,
          resourceType: entityType,
          entityName,
          description: details || `${action} on ${entityName}`,
          outcome: 'SUCCESS',
          metadata: {
            postId: currentUser.postId,
            postTitle: currentUser.postTitle
          }
        })
      }).catch(err => {
        clientSafeLogger.warn('Async audit sync to server skipped or failed', mapToSafeErrorMessage(err));
      });
    }
  };

  const switchUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      // Clear previous user's transient action state to prevent cross-account execution
      setPendingActionPreview(null);
      setCurrentUser(found);
      try {
        localStorage.setItem('tip_crm_auth_user_id_v2', found.id);
      } catch {}
      logAction('Switched User', 'User Session', found.name, `Active role: ${found.roleId} (${found.title})`);
    }
  };

  const switchUserRole = (roleId: RoleId) => {
    const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.volunteer;
    setCurrentUser(prev => {
      const updated: UserProfile = {
        ...prev,
        roleId,
        role: roleId === 'volunteer' ? 'volunteer' : 'staff',
        title: roleDef.name,
        dataScope: { ...roleDef.defaultDataScope }
      };
      return updated;
    });
    setUsers(prev => prev.map(u => u.id === currentUser.id ? {
      ...u,
      roleId,
      role: roleId === 'volunteer' ? 'volunteer' : 'staff',
      title: roleDef.name,
      dataScope: { ...roleDef.defaultDataScope }
    } : u));
    logAction('Role Toggled', 'User Role', currentUser.name, `Switched authority level to ${roleDef.name}`);
  };

  const setUserRole = (role: UserRole) => {
    const targetRoleId: RoleId = role === 'volunteer' ? 'volunteer' : 'staff_manager';
    switchUserRole(targetRoleId);
  };

  const switchActiveRole = async (roleId: RoleId): Promise<boolean> => {
    // 1. Authoritative check on client: must be in assignedRoleIds
    const allowedRoles = currentUser.assignedRoleIds || [currentUser.roleId];
    if (!allowedRoles.includes(roleId)) {
      clientSafeLogger.error('Unauthorized role switch attempt:', roleId);
      return false;
    }

    try {
      // 2. Call backend security endpoint to enforce server-side validation & telemetry
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetRoleId: roleId,
          assignedRoleIds: allowedRoles,
          userStatus: currentUser.status,
          isActive: currentUser.isActive
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        clientSafeLogger.error('Role switch rejected by backend:', err.error);
        return false;
      }
    } catch (e) {
      clientSafeLogger.warn('Backend verification offline, continuing with local validation:', mapToSafeErrorMessage(e));
    }

    // 3. Apply state transition with updated dataScope & roleDefinition
    const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.staff_member;
    const updatedUser: UserProfile = {
      ...currentUser,
      activeRoleId: roleId,
      roleId,
      role: roleId === 'volunteer' ? 'volunteer' : 'staff',
      title: roleDef.name,
      dataScope: { ...roleDef.defaultDataScope }
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    logAction('Switched Workspace Role', 'Authorization', currentUser.name, `Active role changed to ${roleDef.name}`);
    return true;
  };

  const completeFirstLoginPasswordChange = async (currentTempPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword: currentTempPassword,
          newPassword
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update password.' };
      }

      const updatedUser: UserProfile = {
        ...currentUser,
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
        tempPassword: undefined
      };

      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      logAction('Password Changed', 'Security', currentUser.name, 'Successfully updated temporary password upon first login');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating password.' };
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    const updatedUser: UserProfile = {
      ...currentUser,
      onboardingCompleted: true
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    logAction('Onboarding Completed', 'Account', currentUser.name, 'Completed initial orientation tour');
  };

  const adminProvisionUser = async (params: {
    name: string;
    email: string;
    postId?: string;
    assignedRoleIds: RoleId[];
    assignedProgramIds: string[];
    assignedEventIds: string[];
    tempPassword?: string;
    sendInviteEmail?: boolean;
  }): Promise<UserProfile> => {
    const primaryRoleId = params.assignedRoleIds[0] || 'staff_member';
    const roleDef = ROLE_DEFINITIONS[primaryRoleId] || ROLE_DEFINITIONS.staff_member;
    const post = posts.find(p => p.id === params.postId);
    const tempPass = params.tempPassword || ('TIP-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '!' + Math.floor(100 + Math.random() * 900));

    const newUser: UserProfile = {
      id: 'u-' + Date.now(),
      authUserId: 'auth-' + Date.now(),
      organizationId: 'org-tip',
      name: params.name,
      email: params.email,
      roleId: primaryRoleId,
      role: primaryRoleId === 'volunteer' ? 'volunteer' : 'staff',
      assignedRoleIds: params.assignedRoleIds.length > 0 ? params.assignedRoleIds : [primaryRoleId],
      activeRoleId: primaryRoleId,
      title: post?.title || post?.name || roleDef.name,
      postId: params.postId,
      postTitle: post?.title || post?.name,
      responsibilities: post?.responsibilities || [],
      avatarInitials: params.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
      status: 'approved',
      isActive: true,
      emailVerified: true,
      adminApproved: true,
      mustChangePassword: true,
      tempPassword: tempPass,
      onboardingCompleted: false,
      provider: 'email',
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
      assignedProgramIds: params.assignedProgramIds,
      assignedEventIds: params.assignedEventIds,
      dataScope: { ...roleDef.defaultDataScope },
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);
    logAction('Account Provisioned', 'User Management', newUser.name, `Created admin-provisioned account with temporary credentials (${params.assignedRoleIds.join(', ')})`);
    return newUser;
  };

  const adminResetUserPassword = async (userId: string, customTempPassword?: string): Promise<{ tempPassword: string }> => {
    const target = users.find(u => u.id === userId);
    if (!target) throw new Error('User not found');

    let generatedTemp = customTempPassword;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          targetUserId: userId,
          temporaryPassword: customTempPassword
        })
      });
      if (res.ok) {
        const data = await res.json();
        generatedTemp = data.temporaryPassword;
      }
    } catch (e) {
      clientSafeLogger.warn('Reset password backend call offline, generating locally:', mapToSafeErrorMessage(e));
    }

    const finalTemp = generatedTemp || ('TIP-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '!' + Math.floor(100 + Math.random() * 900));

    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      mustChangePassword: true,
      tempPassword: finalTemp
    } : u));

    logAction('Password Reset', 'Security', target.name, `Admin reset password and generated temporary credentials`);
    return { tempPassword: finalTemp };
  };

  const addUser = (userData: Omit<UserProfile, 'id' | 'createdAt'>): UserProfile => {
    const roleDef = ROLE_DEFINITIONS[userData.roleId] || ROLE_DEFINITIONS.volunteer;
    const newUser: UserProfile = {
      ...userData,
      id: 'u-' + Date.now(),
      role: userData.roleId === 'volunteer' ? 'volunteer' : 'staff',
      dataScope: userData.dataScope || { ...roleDef.defaultDataScope },
      avatarInitials: userData.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U',
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    logAction('Created User', 'User Management', newUser.name, `Assigned role ${roleDef.name} (${newUser.email})`);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...updates };
        if (updates.roleId) {
          updated.role = updates.roleId === 'volunteer' ? 'volunteer' : 'staff';
        }
        if (currentUser.id === id) {
          setCurrentUser(updated);
        }
        logAction('Updated User Access', 'User Management', updated.name, 'Updated roles, permissions or scope');
        return updated;
      }
      return u;
    }));
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (target) {
      setUsers(prev => prev.filter(u => u.id !== id));
      logAction('Deactivated User', 'User Management', target.name, `Removed user account ${target.email}`);
    }
  };

  // RBAC permissions helper
  const hasPermission = (resource: ResourceType, action: ActionType) => {
    return checkUserPermission(currentUser, resource, action);
  };

  // Role & Authority Tier Computations
  const currentRoleId: RoleId = currentUser.roleId || (currentUser.role === 'volunteer' ? 'volunteer' : 'staff_manager');
  const roleDefinition = ROLE_DEFINITIONS[currentRoleId] || ROLE_DEFINITIONS.volunteer;
  const roleLevel = roleDefinition.level;
  const userRole: UserRole = currentRoleId === 'volunteer' ? 'volunteer' : 'staff';
  const roleBadge = {
    text: roleDefinition.badgeText,
    bg: roleDefinition.badgeBg,
    label: roleDefinition.name
  };

  const isSuperAdmin = currentRoleId === 'super_admin';
  const isStaffManager = currentRoleId === 'staff_manager';
  const isStaffMember = currentRoleId === 'staff_member';
  const isVolunteer = currentRoleId === 'volunteer';

  const canViewFunding = hasPermission('funding', 'view') && (currentUser?.dataScope?.funding !== 'NONE');
  const canCreateFunding = hasPermission('funding', 'create');
  const canManageUsers = hasPermission('users', 'manage');
  const canExportReports = hasPermission('reports', 'export');
  const canDeleteRecords = hasPermission('people', 'delete');
  const canImportData = hasPermission('people', 'import');

  // Context-bound Permissions Check Utility
  const permissionsUtil: PermissionsUtility = useMemo(() => ({
    can: (action: ActionType, resource: ResourceType) => checkUserPermission(currentUser, resource, action),
    check: (resource: ResourceType, action: ActionType) => checkUserPermission(currentUser, resource, action),
    canView: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'view'),
    canCreate: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'create'),
    canEdit: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'edit'),
    canDelete: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'delete'),
    canExport: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'export'),
    canImport: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'import'),
    canAssign: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'assign'),
    canManage: (resource: ResourceType) => checkUserPermission(currentUser, resource, 'manage'),
    isAtLeast: (minRole: RoleId) => PermissionsLib.hasMinRole(currentUser, minRole),
    getDisabledReason: (resource: ResourceType, action: ActionType) => PermissionsLib.getDisabledReason(currentUser, resource, action)
  }), [currentUser]);

  // Scoped collections
  const scopedPeople = useMemo(() => filterPeopleByScope(people, currentUser), [people, currentUser]);
  const scopedPrograms = useMemo(() => filterProgramsByScope(programs, currentUser), [programs, currentUser]);
  const scopedEvents = useMemo(() => filterEventsByScope(events, currentUser), [events, currentUser]);
  const scopedTasks = useMemo(() => filterTasksByScope(tasks, currentUser), [tasks, currentUser]);

  // Person CRUD
  const addPerson = (data: Omit<Person, 'id' | 'createdAt'>): Person => {
    const newPerson: Person = {
      ...data,
      id: 'p-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setPeople(prev => [newPerson, ...prev]);
    logAction('Added Person', 'Person', newPerson.name, `${newPerson.role || 'Contact'} (${newPerson.email})`);
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'people',
      recordId: newPerson.id,
      opType: 'create',
      payload: newPerson
    }, true).catch(() => {});
    return newPerson;
  };

  const updatePerson = (id: string, updates: Partial<Person>) => {
    setPeople(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        logAction('Updated Person', 'Person', updated.name, 'Updated contact information');
        return updated;
      }
      return p;
    }));
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'people',
      recordId: id,
      opType: 'update',
      payload: updates
    }, true).catch(() => {});
  };

  const deletePerson = (id: string) => {
    const person = people.find(p => p.id === id);
    if (person) {
      setPeople(prev => prev.filter(p => p.id !== id));
      logAction('Removed Person', 'Person', person.name);
      incrementAiDataVersion();
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'people',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  // Organization CRUD
  const addOrganization = (data: Omit<Organization, 'id' | 'createdAt'>): Organization => {
    const newOrg: Organization = {
      ...data,
      id: 'org-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setOrganizations(prev => [newOrg, ...prev]);
    logAction('Added Organization', 'Organization', newOrg.name, `${newOrg.sector} (${newOrg.type})`);
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'organizations',
      recordId: newOrg.id,
      opType: 'create',
      payload: newOrg
    }, true).catch(() => {});
    return newOrg;
  };

  const updateOrganization = (id: string, updates: Partial<Organization>) => {
    setOrganizations(prev => prev.map(org => {
      if (org.id === id) {
        const updated = { ...org, ...updates };
        logAction('Updated Organization', 'Organization', updated.name);
        return updated;
      }
      return org;
    }));
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'organizations',
      recordId: id,
      opType: 'update',
      payload: updates
    }, true).catch(() => {});
  };

  const deleteOrganization = (id: string) => {
    const org = organizations.find(o => o.id === id);
    if (org) {
      setOrganizations(prev => prev.filter(o => o.id !== id));
      logAction('Deleted Organization', 'Organization', org.name, `Removed organization record`);
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'organizations',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  // Program CRUD
  const addProgram = (data: Omit<Program, 'id' | 'createdAt'>): Program => {
    const newProg: Program = {
      ...data,
      id: 'prog-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setPrograms(prev => [newProg, ...prev]);
    logAction('Created Program', 'Program', newProg.name, `Status: ${newProg.status}`);
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'programs',
      recordId: newProg.id,
      opType: 'create',
      payload: newProg
    }, true).catch(() => {});
    return newProg;
  };

  const updateProgram = (id: string, updates: Partial<Program>) => {
    setPrograms(prev => prev.map(prog => {
      if (prog.id === id) {
        const updated = { ...prog, ...updates };
        logAction('Updated Program', 'Program', updated.name, updates.status ? `Status changed to ${updates.status}` : undefined);
        return updated;
      }
      return prog;
    }));
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'programs',
      recordId: id,
      opType: 'update',
      payload: updates
    }, true).catch(() => {});
  };

  const deleteProgram = (id: string) => {
    const prog = programs.find(p => p.id === id);
    if (prog) {
      setPrograms(prev => prev.filter(p => p.id !== id));
      logAction('Deleted Program', 'Program', prog.name, 'Removed program record and cohort references');
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'programs',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  // Event CRUD
  const addEvent = (data: Omit<EventItem, 'id' | 'createdAt'>): EventItem => {
    const newEvt: EventItem = {
      ...data,
      id: 'evt-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setEvents(prev => [newEvt, ...prev]);
    logAction('Created Event', 'Event', newEvt.name, `${newEvt.date} | Facilitator: ${newEvt.facilitator}`);
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'events',
      recordId: newEvt.id,
      opType: 'create',
      payload: newEvt
    }, true).catch(() => {});
    return newEvt;
  };

  const updateEvent = (id: string, updates: Partial<EventItem>) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id === id) {
        const updated = { ...evt, ...updates };
        logAction('Updated Event', 'Event', updated.name);
        return updated;
      }
      return evt;
    }));
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'events',
      recordId: id,
      opType: 'update',
      payload: updates
    }, true).catch(() => {});
  };

  const deleteEvent = (id: string) => {
    const evt = events.find(e => e.id === id);
    if (evt) {
      setEvents(prev => prev.filter(e => e.id !== id));
      logAction('Deleted Event', 'Event', evt.name, `Cancelled and deleted event record for ${evt.date}`);
      incrementAiDataVersion();
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'events',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  // Participant & Attendance
  const updateParticipantStatus = (id: string, status: ParticipantStatus) => {
    setParticipants(prev => prev.map(pt => {
      if (pt.id === id) {
        const updated: ParticipantRecord = {
          ...pt,
          status,
          attendedAt: status === 'Attended' ? new Date().toISOString().split('T')[0] : pt.attendedAt
        };
        logAction('Recorded Attendance', 'Participant', pt.personName, `${status} for ${pt.eventName || 'event'}`);
        return updated;
      }
      return pt;
    }));
    EventsService.updateParticipantStatus(id, status).catch(() => {});
  };

  const addParticipant = (data: Omit<ParticipantRecord, 'id' | 'registeredAt'>) => {
    const newRecord: ParticipantRecord = {
      ...data,
      id: 'pt-' + Date.now(),
      registeredAt: new Date().toISOString().split('T')[0]
    };
    setParticipants(prev => [newRecord, ...prev]);
    logAction('Added Participant', 'Participant', newRecord.personName, `Registered for ${newRecord.eventName || newRecord.programName || 'program'}`);
  };

  // Tasks
  const addTask = (data: Omit<TaskItem, 'id' | 'createdAt'>): TaskItem => {
    const newTask: TaskItem = {
      ...data,
      source: data.source || 'MANUAL',
      assignmentMethod: data.assignmentMethod || 'MANUAL',
      id: 'tsk-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTasks(prev => [newTask, ...prev]);
    logAction('Created Task', 'Task', newTask.title, `Due: ${newTask.dueDate}, Owner: ${newTask.owner}`);
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'tasks',
      recordId: newTask.id,
      opType: 'create',
      payload: newTask
    }, true).catch(() => {});
    return newTask;
  };

  const toggleTaskStatus = (id: string) => {
    let nextStatus: TaskStatus = 'To Do';
    let nextCompletedAt: string | undefined = undefined;

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        nextStatus = t.status === 'Completed' ? 'To Do' : 'Completed';
        nextCompletedAt = nextStatus === 'Completed' ? new Date().toISOString().split('T')[0] : undefined;
        logAction(nextStatus === 'Completed' ? 'Task Completed' : 'Task Reopened', 'Task', t.title);
        return { ...t, status: nextStatus, completedAt: nextCompletedAt };
      }
      return t;
    }));
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'tasks',
      recordId: id,
      opType: 'update',
      payload: { status: nextStatus, completedAt: nextCompletedAt }
    }, true).catch(() => {});
  };

  const updateTask = (id: string, updates: Partial<TaskItem>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    incrementAiDataVersion();
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'tasks',
      recordId: id,
      opType: 'update',
      payload: updates
    }, true).catch(() => {});
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setTasks(prev => prev.filter(t => t.id !== id));
      logAction('Deleted Task', 'Task', task.title);
      incrementAiDataVersion();
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'tasks',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  const approveSuggestedTask = (taskId: string, confirmedAssigneeId?: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const assignee = confirmedAssigneeId ? users.find(u => u.id === confirmedAssigneeId) : undefined;
        const updated: TaskItem = {
          ...t,
          assignmentMethod: 'MANUAL',
          assignedToId: confirmedAssigneeId || t.suggestedAssigneeId || t.assignedToId,
          owner: assignee ? assignee.name : t.owner
        };
        logAction('Approved Task', 'Task Assignment', t.title, `Assigned to ${updated.owner}`);
        return updated;
      }
      return t;
    }));
    incrementAiDataVersion();
  };

  const rejectSuggestedTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (task) {
      logAction('Dismissed Task', 'Task Assignment', task.title);
      incrementAiDataVersion();
    }
  };

  const assignTask = (taskId: string, userId: string, postId?: string) => {
    const user = users.find(u => u.id === userId);
    const post = postId ? posts.find(p => p.id === postId) : undefined;

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated: TaskItem = {
          ...t,
          assignedToId: userId,
          owner: user ? user.name : t.owner,
          assignedPostId: postId || t.assignedPostId,
          assignedPostName: post ? post.name : t.assignedPostName,
          assignmentMethod: 'MANUAL'
        };
        logAction('Assigned Task', 'Task Assignment', t.title, `Assigned to ${user?.name || 'User'} (${post?.name || 'Designated Post'})`);
        return updated;
      }
      return t;
    }));
    incrementAiDataVersion();
  };

  const reassignTask = (taskId: string, newUserId: string, reason?: string) => {
    const user = users.find(u => u.id === newUserId);
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated: TaskItem = {
          ...t,
          assignedToId: newUserId,
          owner: user ? user.name : t.owner,
          notes: reason ? `${t.notes ? t.notes + '\n' : ''}[Reassigned: ${reason}]` : t.notes
        };
        logAction('Reassigned Task', 'Task Assignment', t.title, `Reassigned to ${user?.name || newUserId}. Reason: ${reason || 'N/A'}`);
        return updated;
      }
      return t;
    }));
    incrementAiDataVersion();
  };

  // Post & Responsibility Model methods
  const addPost = (data: Omit<Post, 'id' | 'createdAt'>): Post => {
    const newPost: Post = {
      ...data,
      id: 'post-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setPosts(prev => [...prev, newPost]);
    logAction('Created Post', 'Post Hierarchy', newPost.name, newPost.description);
    return newPost;
  };

  const updatePost = (id: string, updates: Partial<Post>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const addPostResponsibility = (data: Omit<PostResponsibility, 'id'>): PostResponsibility => {
    const newResp: PostResponsibility = {
      ...data,
      id: 'resp-' + Date.now()
    };
    setPostResponsibilities(prev => [...prev, newResp]);
    return newResp;
  };

  const deletePostResponsibility = (id: string) => {
    setPostResponsibilities(prev => prev.filter(r => r.id !== id));
  };

  // Task Templates & Rules Engine methods
  const addTaskTemplate = (data: Omit<TaskTemplate, 'id' | 'createdAt'>): TaskTemplate => {
    const newTpl: TaskTemplate = {
      ...data,
      id: 'tpl-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTaskTemplates(prev => [...prev, newTpl]);
    return newTpl;
  };

  const updateTaskTemplate = (id: string, updates: Partial<TaskTemplate>) => {
    setTaskTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTaskTemplate = (id: string) => {
    setTaskTemplates(prev => prev.filter(t => t.id !== id));
  };

  const addTaskRule = (data: Omit<TaskAssignmentRule, 'id' | 'createdAt'>): TaskAssignmentRule => {
    const newRule: TaskAssignmentRule = {
      ...data,
      id: 'rule-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTaskRules(prev => [...prev, newRule]);
    return newRule;
  };

  const updateTaskRule = (id: string, updates: Partial<TaskAssignmentRule>) => {
    setTaskRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteTaskRule = (id: string) => {
    setTaskRules(prev => prev.filter(r => r.id !== id));
  };

  const executeRulesForTrigger = (triggerType: TaskTriggerType, context: Record<string, any>): TaskItem[] => {
    const matchingRules = taskRules.filter(r => r.isActive && r.triggerType === triggerType);
    const createdTasks: TaskItem[] = [];

    matchingRules.forEach(rule => {
      const template = taskTemplates.find(t => t.id === rule.taskTemplateId);
      const title = template ? template.name : rule.name;
      const description = template ? template.description : `Triggered by rule ${rule.name}`;
      const dueDays = template?.defaultDueDays || 2;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dueDays);
      const dueDate = targetDate.toISOString().split('T')[0];

      const designatedUser = users.find(u => u.postId === rule.postId) || 
        users.find(u => u.id === rule.defaultAssigneeId);

      const post = posts.find(p => p.id === rule.postId);

      const newTask: TaskItem = {
        id: 'tsk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        title,
        description,
        owner: designatedUser ? designatedUser.name : (post ? post.name : 'Unassigned'),
        assignedToId: rule.assignmentMode === 'Automatic' ? designatedUser?.id : undefined,
        assignedPostId: rule.postId,
        assignedPostName: post?.name || rule.postName,
        dueDate,
        priority: template?.defaultPriority || 'Medium',
        status: 'To Do',
        source: 'RULE',
        assignmentMethod: rule.assignmentMode === 'Automatic' ? 'AUTOMATIC' : 'SUGGESTED',
        suggestedReason: `Rule triggered: ${rule.name}`,
        suggestedAssigneeId: designatedUser?.id,
        suggestedAssigneeName: designatedUser?.name,
        eventId: context.eventId,
        eventName: context.eventName,
        programId: context.programId,
        programName: context.programName,
        createdAt: new Date().toISOString().split('T')[0]
      };

      createdTasks.push(newTask);
    });

    if (createdTasks.length > 0) {
      setTasks(prev => [...createdTasks, ...prev]);
      logAction('Rule Triggered', 'Workflow Engine', `${createdTasks.length} task(s) generated for ${triggerType}`);
    }

    return createdTasks;
  };

  // Funding
  const addFunding = (data: Omit<FundingRecord, 'id' | 'createdAt'>): FundingRecord => {
    const newFunding: FundingRecord = {
      ...data,
      id: 'fnd-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setFunding(prev => [newFunding, ...prev]);
    logAction('Added Funding Record', 'Funding', newFunding.donorOrFunder, `$${newFunding.amountCad.toLocaleString('en-CA')} CAD (${newFunding.fundingType})`);
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'funding',
      recordId: newFunding.id,
      opType: 'create',
      payload: newFunding
    }, true).catch(() => {});
    return newFunding;
  };

  const updateFunding = (id: string, updates: Partial<FundingRecord>) => {
    setFunding(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'funding',
      recordId: id,
      opType: 'update',
      payload: updates
    }, true).catch(() => {});
  };

  const deleteFunding = (id: string) => {
    const item = funding.find(f => f.id === id);
    if (item) {
      setFunding(prev => prev.filter(f => f.id !== id));
      logAction('Deleted Funding Record', 'Funding', item.donorOrFunder, `Removed grant/allocation of $${item.amountCad.toLocaleString('en-CA')} CAD`);
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'funding',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  // Interaction
  const addInteraction = (data: Omit<InteractionItem, 'id' | 'createdAt'>): InteractionItem => {
    const newInt: InteractionItem = {
      ...data,
      id: 'int-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInteractions(prev => [newInt, ...prev]);
    
    // Auto-update person's lastInteractionDate & nextFollowUpDate if applicable
    if (newInt.personId) {
      setPeople(prev => prev.map(p => {
        if (p.id === newInt.personId) {
          return {
            ...p,
            lastInteractionDate: newInt.date,
            nextFollowUpDate: newInt.followUpDate || p.nextFollowUpDate
          };
        }
        return p;
      }));
    }
    
    logAction('Logged Interaction', 'Interaction', newInt.personName || newInt.organizationName || 'Stakeholder', `${newInt.type}: ${newInt.summary}`);
    return newInt;
  };

  // Documents
  const addDocument = (data: Omit<DocumentItem, 'id' | 'addedAt'>): DocumentItem => {
    const newDoc: DocumentItem = {
      ...data,
      id: 'doc-' + Date.now(),
      addedAt: new Date().toISOString().split('T')[0]
    };
    setDocuments(prev => [newDoc, ...prev]);
    logAction('Added Document Reference', 'Document', newDoc.title, `${newDoc.type} linked to ${newDoc.relatedName || newDoc.relatedType}`);
    syncEngine.queueMutation({
      userId: currentUser.id,
      resource: 'documents',
      recordId: newDoc.id,
      opType: 'create',
      payload: newDoc
    }, true).catch(() => {});
    return newDoc;
  };

  const deleteDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      logAction('Deleted Document Reference', 'Document', doc.title, `Removed document reference (${doc.type})`);
      syncEngine.queueMutation({
        userId: currentUser.id,
        resource: 'documents',
        recordId: id,
        opType: 'delete',
        payload: { id }
      }, true).catch(() => {});
    }
  };

  // Database Restore
  const restoreDatabaseFromBackup = (backupData: any): {
    success: boolean;
    error?: string;
    restoredCounts?: Record<string, number>;
  } => {
    if (!isSuperAdmin && !hasPermission('settings', 'manage')) {
      logAction('Unauthorized Restore Attempt', 'System Security', 'Database Restore', 'Attempted database restore without super_admin or settings.manage permission');
      return { success: false, error: 'Access Denied: Only Super Administrators can restore system databases.' };
    }

    const validation = validateBackupStructure(backupData);
    if (!validation.valid || !validation.sanitizedData) {
      logAction('Database Restore Failed', 'System Security', 'Database Restore', `Validation error: ${validation.error}`);
      return { success: false, error: validation.error || 'Invalid backup structure.' };
    }

    const data = validation.sanitizedData;
    const restoredCounts: Record<string, number> = {};

    if (Array.isArray(data.people)) {
      setPeople(data.people);
      saveToStorage('people', data.people);
      restoredCounts.people = data.people.length;
    }
    if (Array.isArray(data.organizations)) {
      setOrganizations(data.organizations);
      saveToStorage('organizations', data.organizations);
      restoredCounts.organizations = data.organizations.length;
    }
    if (Array.isArray(data.programs)) {
      setPrograms(data.programs);
      saveToStorage('programs', data.programs);
      restoredCounts.programs = data.programs.length;
    }
    if (Array.isArray(data.events)) {
      setEvents(data.events);
      saveToStorage('events', data.events);
      restoredCounts.events = data.events.length;
    }
    if (Array.isArray(data.participants)) {
      setParticipants(data.participants);
      saveToStorage('participants', data.participants);
      restoredCounts.participants = data.participants.length;
    }
    if (Array.isArray(data.tasks)) {
      setTasks(data.tasks);
      saveToStorage('tasks', data.tasks);
      restoredCounts.tasks = data.tasks.length;
    }
    if (Array.isArray(data.funding)) {
      setFunding(data.funding);
      saveToStorage('funding', data.funding);
      restoredCounts.funding = data.funding.length;
    }
    if (Array.isArray(data.interactions)) {
      setInteractions(data.interactions);
      saveToStorage('interactions', data.interactions);
      restoredCounts.interactions = data.interactions.length;
    }
    if (Array.isArray(data.documents)) {
      setDocuments(data.documents);
      saveToStorage('documents', data.documents);
      restoredCounts.documents = data.documents.length;
    }

    incrementAiDataVersion();

    const summaryStr = Object.entries(restoredCounts).map(([k, v]) => `${k}: ${v}`).join(', ');
    logAction('Executed Database Restore', 'System Security', 'Database Restore', `Successfully restored entities: ${summaryStr}`);

    return {
      success: true,
      restoredCounts
    };
  };

  // Batch import people
  const batchImportPeople = (imported: Array<{
    name: string;
    email: string;
    role?: string;
    organizationName?: string;
    relationshipTypes: string[];
    phone?: string;
    interests?: string[];
  }>) => {
    let addedCount = 0;
    let duplicateCount = 0;
    const existingEmails = new Set(people.map(p => p.email.toLowerCase().trim()));

    const newPeopleList: Person[] = [];

    imported.forEach(item => {
      const normalizedEmail = (item.email || '').toLowerCase().trim();
      if (!normalizedEmail || existingEmails.has(normalizedEmail)) {
        duplicateCount++;
        return;
      }
      existingEmails.add(normalizedEmail);
      addedCount++;
      newPeopleList.push({
        id: 'p-import-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: item.name.trim(),
        email: normalizedEmail,
        role: item.role?.trim() || 'Community Member',
        organizationName: item.organizationName?.trim(),
        relationshipTypes: (item.relationshipTypes.length > 0 ? item.relationshipTypes : ['Participant']) as any,
        phone: item.phone?.trim(),
        interests: item.interests || ['Community Engagement'],
        programIds: [],
        eventIds: [],
        createdAt: new Date().toISOString().split('T')[0]
      });
    });

    if (newPeopleList.length > 0) {
      setPeople(prev => [...newPeopleList, ...prev]);
      logAction('Imported Contacts', 'Data Import', `${addedCount} contacts added`, `${duplicateCount} duplicates skipped`);
    }

    return { addedCount, duplicateCount };
  };

  // Reset demo data
  const resetAllData = () => {
    setCurrentUser(INITIAL_USERS[0]);
    setPeople(INITIAL_PEOPLE);
    setOrganizations(INITIAL_ORGANIZATIONS);
    setPrograms(INITIAL_PROGRAMS);
    setEvents(INITIAL_EVENTS);
    setParticipants(INITIAL_PARTICIPANTS);
    setTasks(INITIAL_TASKS);
    setFunding(INITIAL_FUNDING);
    setInteractions(INITIAL_INTERACTIONS);
    setDocuments(INITIAL_DOCUMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setPosts(INITIAL_POSTS);
    setPostResponsibilities(INITIAL_POST_RESPONSIBILITIES);
    setTaskTemplates(INITIAL_TASK_TEMPLATES);
    setTaskRules(INITIAL_TASK_ASSIGNMENT_RULES);
    setTaskAssignments(INITIAL_TASK_ASSIGNMENTS);
    setTaskActivity(INITIAL_TASK_ACTIVITY);
    setAiSuggestions(INITIAL_AI_SUGGESTIONS);
    setAiConversations(INITIAL_AI_CONVERSATIONS);
    setAiMessages(INITIAL_AI_MESSAGES);
    setAiBehaviorSnapshots(INITIAL_BEHAVIOR_SNAPSHOTS);
    setAiUserSettings(INITIAL_AI_USER_SETTINGS);
    setAiBudgetConfig({
      dailyRequestLimit: 50,
      monthlyRequestLimit: 1000,
      perUserLimit: 15,
      csvAnalysisLimit: 10,
      chatLimit: 25,
      reportGenLimit: 10,
      privacyMode: 'minimal'
    });
    setAiDataVersion(1);
    setDismissedSuggestionHashes({});
    localStorage.clear();
    logAction('System Reset', 'Database', 'All records restored to TIP defaults');
  };

  // TIP Intelligence Handlers
  const updateSuggestionStatus = (id: string, status: AiSuggestionStatus) => {
    if (status === 'dismissed') {
      const target = aiSuggestions.find(s => s.id === id);
      if (target?.suggestionHash) {
        setDismissedSuggestionHashes(prev => {
          const updated = { ...prev, [target.suggestionHash!]: new Date().toISOString() };
          saveToStorage('ai_dismissed_hashes', updated);
          return updated;
        });
      }
    }

    setAiSuggestions(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status,
          resolvedAt: (status === 'accepted' || status === 'dismissed' || status === 'completed') ? new Date().toISOString() : s.resolvedAt
        };
      }
      return s;
    }));
  };

  const recordSuggestionFeedback = (id: string, feedback: 'useful' | 'not_useful') => {
    setAiSuggestions(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, userFeedback: feedback };
      }
      return s;
    }));
    logAction('Recorded AI Feedback', 'AI Intelligence', id, `Marked as ${feedback}`);
  };

  const updateAiUserSettings = (settings: Partial<AiUserSettings>) => {
    setAiUserSettings(prev => ({ ...prev, ...settings }));
    logAction('Updated AI Settings', 'AI Intelligence', 'Preferences', JSON.stringify(settings));
  };

  const refreshAiSuggestions = () => {
    const patterns = detectWorkPatterns({
      currentUser,
      tasks,
      events,
      people,
      organizations,
      programs,
      interactions,
      rules: taskRules,
      dismissedHashes: dismissedSuggestionHashes,
      referenceDate: '2026-09-23'
    });

    setAiSuggestions(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const newItems = patterns.filter(p => !existingIds.has(p.id));
      return [...newItems, ...prev];
    });

    const userSnap = calculateUserBehaviorSnapshot({
      user: currentUser,
      tasks,
      events,
      interactions,
      people,
      referenceDate: '2026-09-23'
    });

    const orgSnap = calculateOrgBehaviorSnapshot({
      users,
      tasks,
      events,
      interactions,
      people,
      referenceDate: '2026-09-23'
    });

    setAiBehaviorSnapshots([userSnap, orgSnap]);
  };

  const sendIntelligenceMessage = async (
    content: string, 
    conversationId: string = activeAiConversationId,
    context?: any
  ): Promise<AiMessage> => {
    const userMsgId = 'msg-' + Date.now();
    const userMsg: AiMessage = {
      id: userMsgId,
      conversationId,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setAiMessages(prev => [...prev, userMsg]);

    const userTasks = tasks.filter(t => t.assignedToId === currentUser.id || t.owner === currentUser.name);
    const openUserTasks = userTasks.filter(t => t.status !== 'Completed');
    const overdueTasks = openUserTasks.filter(t => t.dueDate && t.dueDate < '2026-09-23');
    const allOpenTasks = tasks.filter(t => t.status !== 'Completed');
    const unassignedTasks = allOpenTasks.filter(t => !t.assignedToId || t.assignedToId.trim() === '');

    const deterministicFacts = {
      openTaskCount: openUserTasks.length,
      overdueTaskCount: overdueTasks.length,
      upcomingEventCount: events.filter(e => e.date >= '2026-09-23').length,
      totalOpenTasks: allOpenTasks.length,
      unassignedTaskCount: unassignedTasks.length,
      referenceDate: '2026-09-23'
    };

    const response = await sendIntelligenceQuery({
      message: content,
      conversationId,
      user: currentUser,
      context,
      deterministicFacts,
      history: aiMessages.filter(m => m.conversationId === conversationId),
      crmData: {
        tasks,
        events,
        programs,
        people,
        funding,
        referenceDate: '2026-09-23'
      },
      dataVersion: aiDataVersion,
      privacyMode: aiBudgetConfig.privacyMode
    });

    const assistantMsg: AiMessage = {
      id: 'msg-ai-' + Date.now(),
      conversationId,
      role: 'assistant',
      content: response.content,
      suggestedActions: response.suggestedActions,
      actionPreview: response.actionPreview,
      supportingData: response.supportingData,
      tier: response.tier,
      cached: response.cached,
      tokensUsed: response.tokensUsed,
      source: response.source,
      budgetExceeded: response.budgetExceeded,
      timestamp: new Date().toISOString()
    };

    setAiMessages(prev => [...prev, assistantMsg]);
    return assistantMsg;
  };

  const executeAiAction = async (actionPreview: AiActionPreview): Promise<{ success: boolean; message: string }> => {
    await confirmAiActionOnServer(actionPreview, currentUser);

    switch (actionPreview.actionType) {
      case 'create_tasks': {
        const tasksToCreate = actionPreview.payload?.tasks || [];
        if (actionPreview.payload?.taskId && actionPreview.payload?.newDueDate) {
          updateTask(actionPreview.payload.taskId, { 
            dueDate: actionPreview.payload.newDueDate,
            priority: 'High'
          });
        } else {
          tasksToCreate.forEach((t: any) => {
            addTask({
              title: t.title,
              description: t.description || `Generated via TIP Intelligence action: ${actionPreview.title}`,
              status: t.status === 'In Progress' || t.status === 'Completed' ? t.status : 'To Do',
              priority: (t.priority === 'High' || t.priority === 'Low' || t.priority === 'Medium') ? t.priority : 'Medium',
              owner: t.owner || t.assignedToName || currentUser.name,
              assignedToId: t.assignedToId || currentUser.id,
              programId: t.programId || 'prog-2',
              dueDate: t.dueDate || '2026-09-24',
              source: 'AI_SUGGESTION',
              assignmentMethod: 'SUGGESTED',
              aiGenerated: true
            });
          });
        }
        break;
      }

      case 'assign_task': {
        const { taskIds, assigneeId, assigneeName } = actionPreview.payload || {};
        if (taskIds && Array.isArray(taskIds)) {
          taskIds.forEach((tid: string) => {
            assignTask(tid, assigneeId, assigneeName);
          });
        }
        break;
      }

      case 'complete_task': {
        const { taskId } = actionPreview.payload || {};
        if (taskId) {
          updateTask(taskId, { status: 'Completed', completedAt: new Date().toISOString().split('T')[0] });
        }
        break;
      }

      case 'create_rule': {
        addTaskRule({
          organizationId: currentUser.organizationId || 'org-tip',
          name: actionPreview.payload.name || 'AI Proposed Assignment Rule',
          triggerType: actionPreview.payload.triggerType || 'PARTICIPANT_REGISTERED',
          taskTemplateId: actionPreview.payload.taskTemplateId || 'tt-1',
          taskTemplateName: actionPreview.payload.taskTemplateName || 'Workshop Follow-up',
          postId: actionPreview.payload.assignedPostId || actionPreview.payload.postId || 'post-pc',
          postName: actionPreview.payload.postName || 'Program Coordinator',
          defaultAssigneeId: actionPreview.payload.assignedUserId || actionPreview.payload.defaultAssigneeId,
          assignmentMode: (actionPreview.payload.assignmentMode === 'Manual' || actionPreview.payload.assignmentMode === 'Automatic') 
            ? actionPreview.payload.assignmentMode 
            : 'Suggested',
          isActive: true,
          createdBy: currentUser.name
        });
        break;
      }

      case 'log_interaction': {
        addInteraction({
          personId: actionPreview.payload.personId,
          personName: actionPreview.payload.personName,
          organizationId: actionPreview.payload.organizationId,
          organizationName: actionPreview.payload.organizationName,
          type: actionPreview.payload.type || 'Call',
          date: '2026-09-23',
          summary: actionPreview.payload.summary || actionPreview.title,
          details: actionPreview.payload.details || actionPreview.description,
          authorName: currentUser.name
        });
        break;
      }
    }

    setAiSuggestions(prev => prev.map(s => {
      if (s.actionPreview?.id === actionPreview.id) {
        return { ...s, status: 'completed', resolvedAt: new Date().toISOString() };
      }
      return s;
    }));

    logAction('Confirmed AI Action', 'TIP Intelligence', actionPreview.title, `Action type: ${actionPreview.actionType}`);

    return { 
      success: true, 
      message: `Action "${actionPreview.title}" executed successfully.` 
    };
  };

  return (
    <CrmContext.Provider value={{
      users,
      currentUser,
      switchUser,
      switchUserRole,
      switchActiveRole,
      completeFirstLoginPasswordChange,
      completeOnboarding,
      adminProvisionUser,
      adminResetUserPassword,
      setUserRole,
      addUser,
      updateUser,
      deleteUser,
      userRole,
      currentRoleId,
      roleLevel,
      roleDefinition,
      roleBadge,
      hasPermission,
      Permissions: permissionsUtil,
      isSuperAdmin,
      isStaffManager,
      isStaffMember,
      isVolunteer,
      canViewFunding,
      canCreateFunding,
      canManageUsers,
      canExportReports,
      canDeleteRecords,
      canImportData,
      scopedPeople,
      scopedPrograms,
      scopedEvents,
      scopedTasks,
      people,
      organizations,
      programs,
      events,
      participants,
      tasks,
      funding,
      interactions,
      documents,
      auditLogs,
      logAudit: logAction,
      addPerson,
      updatePerson,
      deletePerson,
      addOrganization,
      updateOrganization,
      deleteOrganization,
      addProgram,
      updateProgram,
      deleteProgram,
      addEvent,
      updateEvent,
      deleteEvent,
      updateParticipantStatus,
      addParticipant,
      addTask,
      toggleTaskStatus,
      updateTask,
      deleteTask,
      approveSuggestedTask,
      rejectSuggestedTask,
      assignTask,
      reassignTask,
      posts,
      postResponsibilities,
      addPost,
      updatePost,
      deletePost,
      addPostResponsibility,
      deletePostResponsibility,
      taskTemplates,
      taskRules,
      taskAssignments,
      taskActivity,
      addTaskTemplate,
      updateTaskTemplate,
      deleteTaskTemplate,
      addTaskRule,
      updateTaskRule,
      deleteTaskRule,
      executeRulesForTrigger,
      addFunding,
      updateFunding,
      deleteFunding,
      addInteraction,
      addDocument,
      deleteDocument,
      restoreDatabaseFromBackup,
      batchImportPeople,
      resetAllData,
      aiSuggestions,
      aiConversations,
      aiMessages,
      aiBehaviorSnapshots,
      aiUserSettings,
      aiBudgetConfig,
      updateAiBudgetConfig,
      aiDataVersion,
      incrementAiDataVersion,
      activeAiConversationId,
      isAiDrawerOpen,
      setIsAiDrawerOpen,
      setActiveAiConversationId,
      updateSuggestionStatus,
      recordSuggestionFeedback,
      sendIntelligenceMessage,
      executeAiAction,
      updateAiUserSettings,
      refreshAiSuggestions,
      pendingActionPreview,
      setPendingActionPreview,
      databaseReadiness,
      refreshDatabaseReadiness
    }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
