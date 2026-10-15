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
    name: 'TIP Administrator',
    email: 'tipcrm090@theinclusionproject.ca',
    phone: '+1 (604) 555-0100',
    roleId: 'super_admin',
    role: 'staff',
    assignedRoleIds: ['super_admin'],
    activeRoleId: 'super_admin',
    title: 'Executive Director & Super Admin',
    postId: 'post-ed',
    postTitle: 'Executive Director',
    responsibilities: [
      'Strategic leadership & organizational vision',
      'Board governance and fiduciary oversight',
      'High-impact philanthropic partnerships',
      'Team post, rule & AI orchestration configuration'
    ],
    avatarInitials: 'TA',
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
    name: 'Executive Director',
    description: 'Executive leadership, fiduciary responsibility, board governance, and high-level stakeholder engagement across Canada.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-pm',
    organizationId: 'org-tip',
    name: 'Program Manager',
    description: 'Strategic program oversight, partner relationships, milestone tracking, and monthly reporting across all cohorts.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-pc',
    organizationId: 'org-tip',
    name: 'Program Coordinator',
    description: 'Day-to-day cohort coordination, event logistics, participant outreach, attendance tracking, and follow-ups.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-ops',
    organizationId: 'org-tip',
    name: 'Operations Coordinator',
    description: 'Internal operations, vendor relationships, equipment procurement, and administrative workflows.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-comm',
    organizationId: 'org-tip',
    name: 'Community Engagement Officer',
    description: 'Grassroots community outreach, coalition building, youth networks, and external communications.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-facil',
    organizationId: 'org-tip',
    name: 'Workshop Facilitator',
    description: 'Delivering inclusive workshops, leading panel discussions, breakout engagement, and collecting feedback.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-vol',
    organizationId: 'org-tip',
    name: 'Volunteer',
    description: 'Front-desk registration check-in, welcoming attendees, distributing event collateral, and logistics support.',
    isActive: true,
    createdAt: '2025-01-01'
  }
];

export const INITIAL_POST_RESPONSIBILITIES: PostResponsibility[] = [
  { id: 'pr-1', postId: 'post-ed', name: 'Strategic leadership & board governance', defaultPriority: 'High', isActive: true },
  { id: 'pr-2', postId: 'post-ed', name: 'Philanthropic partnership cultivation & grant approvals', defaultPriority: 'High', isActive: true },
  { id: 'pr-3', postId: 'post-pm', name: 'Program deliverable & monthly cohort reporting', defaultPriority: 'High', isActive: true },
  { id: 'pr-4', postId: 'post-pm', name: 'Grant milestone reconciliation & evaluation', defaultPriority: 'High', isActive: true },
  { id: 'pr-5', postId: 'post-pc', name: 'Event logistics, speaker booking & attendee check-in', defaultPriority: 'High', isActive: true },
  { id: 'pr-6', postId: 'post-pc', name: '48-hour participant follow-up & survey tracking', defaultPriority: 'High', isActive: true },
  { id: 'pr-7', postId: 'post-vol', name: 'Welcome desk check-in & attendee collateral distribution', defaultPriority: 'Normal', isActive: true }
];

export const INITIAL_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tt-1',
    organizationId: 'org-tip',
    name: 'Follow up with workshop participants',
    description: 'Send post-event feedback survey and links to presentation slides within 48 hours.',
    postId: 'post-pc',
    postName: 'Program Coordinator',
    defaultPriority: 'Medium',
    defaultDueDays: 2,
    relatedEntityType: 'Event',
    isActive: true,
    createdAt: '2025-01-10'
  },
  {
    id: 'tt-2',
    organizationId: 'org-tip',
    name: 'Record attendance and participation metrics',
    description: 'Reconcile registration list with verified event attendees in CRM.',
    postId: 'post-pc',
    postName: 'Program Coordinator',
    defaultPriority: 'High',
    defaultDueDays: 1,
    relatedEntityType: 'Event',
    isActive: true,
    createdAt: '2025-01-10'
  },
  {
    id: 'tt-3',
    organizationId: 'org-tip',
    name: 'Prepare monthly program report',
    description: 'Compile monthly cohort attendance, milestone progress, and budget burn rate.',
    postId: 'post-pm',
    postName: 'Program Manager',
    defaultPriority: 'High',
    defaultDueDays: 5,
    relatedEntityType: 'Program',
    isActive: true,
    createdAt: '2025-01-10'
  },
  {
    id: 'tt-4',
    organizationId: 'org-tip',
    name: 'Confirm participant check-ins and welcome packets',
    description: 'Assist with on-site desk check-in, name tags, and accessibility accommodations.',
    postId: 'post-vol',
    postName: 'Volunteer',
    defaultPriority: 'Medium',
    defaultDueDays: 0,
    relatedEntityType: 'Event',
    isActive: true,
    createdAt: '2025-01-10'
  },
  {
    id: 'tt-5',
    organizationId: 'org-tip',
    name: 'Verify grant deliverable milestones',
    description: 'Review interim targets with program coordinators ahead of funder reporting deadlines.',
    postId: 'post-pm',
    postName: 'Program Manager',
    defaultPriority: 'High',
    defaultDueDays: 7,
    relatedEntityType: 'Program',
    isActive: true,
    createdAt: '2025-01-10'
  }
];

export const INITIAL_TASK_ASSIGNMENT_RULES: TaskAssignmentRule[] = [
  {
    id: 'rule-1',
    organizationId: 'org-tip',
    name: 'Event Completed -> Record Attendance & Follow-up',
    triggerType: 'EVENT_COMPLETED',
    triggerConditions: { eventType: 'Workshop' },
    taskTemplateId: 'tt-2',
    taskTemplateName: 'Record attendance and participation metrics',
    postId: 'post-pc',
    postName: 'Program Coordinator',
    assignmentMode: 'Suggested',
    isActive: true,
    createdBy: 'TIP Administrator',
    createdAt: '2025-01-15'
  },
  {
    id: 'rule-2',
    organizationId: 'org-tip',
    name: 'Participant Missed Session -> Outreach Follow-up',
    triggerType: 'PARTICIPANT_MISSED',
    triggerConditions: { maxConsecutiveAbsences: 1 },
    taskTemplateId: 'tt-1',
    taskTemplateName: 'Follow up with workshop participants',
    postId: 'post-pc',
    postName: 'Program Coordinator',
    assignmentMode: 'Suggested',
    isActive: true,
    createdBy: 'TIP Administrator',
    createdAt: '2025-01-15'
  },
  {
    id: 'rule-3',
    organizationId: 'org-tip',
    name: 'Month Ends -> Monthly Program Report',
    triggerType: 'MONTH_END',
    taskTemplateId: 'tt-3',
    taskTemplateName: 'Prepare monthly program report',
    postId: 'post-pm',
    postName: 'Program Manager',
    assignmentMode: 'Suggested',
    isActive: true,
    createdBy: 'TIP Administrator',
    createdAt: '2025-01-15'
  }
];

export const INITIAL_TASKS: TaskItem[] = [];
export const INITIAL_TASK_ASSIGNMENTS: TaskAssignmentRecord[] = [];
export const INITIAL_TASK_ACTIVITY: TaskActivityRecord[] = [];
export const INITIAL_FUNDING: FundingRecord[] = [];
export const INITIAL_INTERACTIONS: InteractionItem[] = [];
export const INITIAL_DOCUMENTS: DocumentItem[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

export const INITIAL_AI_USER_SETTINGS: AiUserSettings = {
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
