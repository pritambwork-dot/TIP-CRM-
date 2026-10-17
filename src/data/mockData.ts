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
  Post,
  PostResponsibility,
  UserPost,
  TaskTemplate,
  TaskAssignmentRule,
  TaskAssignmentRecord,
  TaskActivityRecord,
  AiSuggestion,
  AiBehaviorSnapshot,
  AiConversation,
  AiMessage,
  AiUserSettings,
  AiActionRecord
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u-admin-090',
    authUserId: 'auth-tipcrm090',
    organizationId: 'org-tip',
    name: 'TIP Super Admin',
    email: 'theinclusionproject.crm@gmail.com',
    phone: '+1 (604) 555-0100',
    roleId: 'super_admin',
    role: 'staff',
    assignedRoleIds: ['super_admin'],
    activeRoleId: 'super_admin',
    title: 'Super Administrator',
    postId: 'post-ed',
    postTitle: 'Super Administrator',
    responsibilities: [
      'Strategic leadership & organizational vision',
      'System governance, security, and data access control',
      'Super Admin orchestration and audit trail oversight'
    ],
    avatarInitials: 'SA',
    status: 'approved',
    isActive: true,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: false,
    onboardingCompleted: true,
    provider: 'email',
    approvedBy: 'System Seed',
    approvedAt: '2025-01-01T00:00:00Z',
    assignedProgramIds: [],
    assignedEventIds: [],
    dataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'ALL'
    },
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: new Date().toISOString()
  }
];

export const INITIAL_ACCESS_REQUESTS: any[] = [];
export const INITIAL_PEOPLE: Person[] = [];
export const INITIAL_ORGANIZATIONS: Organization[] = [];
export const INITIAL_PROGRAMS: Program[] = [];
export const INITIAL_EVENTS: EventItem[] = [];
export const INITIAL_PARTICIPANTS: ParticipantRecord[] = [];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-ed',
    organizationId: 'org-tip',
    name: 'Super Administrator',
    description: 'Executive leadership, fiduciary responsibility, board governance, and complete system administration.',
    isActive: true,
    createdAt: '2025-01-01'
  }
];

export const INITIAL_POST_RESPONSIBILITIES: PostResponsibility[] = [];
export const INITIAL_TASK_TEMPLATES: TaskTemplate[] = [];
export const INITIAL_TASK_ASSIGNMENT_RULES: TaskAssignmentRule[] = [];

export const INITIAL_TASKS: TaskItem[] = [];
export const INITIAL_TASK_ASSIGNMENTS: TaskAssignmentRecord[] = [];
export const INITIAL_TASK_ACTIVITY: TaskActivityRecord[] = [];
export const INITIAL_FUNDING: FundingRecord[] = [];
export const INITIAL_INTERACTIONS: InteractionItem[] = [];
export const INITIAL_DOCUMENTS: DocumentItem[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

export const INITIAL_AI_USER_SETTINGS: AiUserSettings = {
  aiEnabled: true,
  taskSuggestionsEnabled: true,
  dailyBriefEnabled: true,
  workflowSuggestionsEnabled: true,
  notificationsThreshold: 'all',
  suggestionsEnabled: true
};

export const INITIAL_AI_SUGGESTIONS: AiSuggestion[] = [];
export const INITIAL_BEHAVIOR_SNAPSHOTS: AiBehaviorSnapshot[] = [];
export const INITIAL_AI_CONVERSATIONS: AiConversation[] = [];
export const INITIAL_AI_MESSAGES: AiMessage[] = [];
