export type RelationshipType = 
  | 'Partner'
  | 'Funder / Donor'
  | 'Participant'
  | 'Volunteer'
  | 'Advisor'
  | 'Facilitator'
  | 'Stakeholder'
  | 'Other';

export type OrgType = 
  | 'Partner'
  | 'Funder'
  | 'Community Organization'
  | 'Institution'
  | 'Company'
  | 'Government Organization'
  | 'University'
  | 'Other';

export type ProgramStatus = 
  | 'Planning'
  | 'Active'
  | 'On Hold'
  | 'Completed'
  | 'Archived';

export type EventType = 
  | 'Workshop'
  | 'Consultation'
  | 'Community Forum'
  | 'Training'
  | 'Panel'
  | 'Youth Lab';

export type ParticipantStatus = 
  | 'Registered'
  | 'Attended'
  | 'Did not attend'
  | 'Completed'
  | 'Waitlisted'
  | 'Withdrawn';

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export type InteractionType = 
  | 'Email'
  | 'Meeting'
  | 'Call'
  | 'Workshop'
  | 'Note'
  | 'Follow-up';

export type FundingType = 
  | 'Grant'
  | 'Foundation'
  | 'Government'
  | 'Individual Donation'
  | 'Corporate Sponsorship';

export type UserRole = 'staff' | 'volunteer';

export type RoleId = 
  | 'super_admin' 
  | 'staff_manager' 
  | 'staff_member' 
  | 'volunteer'
  | 'program_coordinator'
  | 'event_coordinator';

export type UserAccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'disabled' | 'Active' | 'Inactive';

export type DataScopeType = 'GLOBAL' | 'ORGANIZATION' | 'PROGRAM' | 'EVENT' | 'ASSIGNED' | 'OWN_RECORD';

export type ResourceType = 
  | 'people'
  | 'organizations'
  | 'programs'
  | 'events'
  | 'participants'
  | 'tasks'
  | 'interactions'
  | 'funding'
  | 'reports'
  | 'documents'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'settings'
  | 'integrations'
  | 'audit_logs'
  | 'intelligence';

export type ActionType = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import'
  | 'assign'
  | 'disable'
  | 'manage';

export interface UserDataScope {
  people: 'GLOBAL' | 'ORGANIZATION' | 'ASSIGNED' | 'OWN_RECORD';
  programs: 'ALL' | 'ASSIGNED';
  events: 'ALL' | 'ASSIGNED';
  funding: 'ALL' | 'VIEW' | 'NONE';
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: RoleId;
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  authUserId?: string;
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  roleId: RoleId;
  role: UserRole;
  assignedRoleIds: RoleId[];
  activeRoleId?: RoleId;
  title: string;
  avatarInitials: string;
  status: UserAccountStatus;
  isActive: boolean;
  emailVerified: boolean;
  adminApproved: boolean;
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
  onboardingCompleted?: boolean;
  tempPassword?: string;
  passwordHash?: string;
  password?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  requestedAt?: string;
  provider?: 'google' | 'email';
  assignedProgramIds: string[];
  assignedEventIds: string[];
  postId?: string;
  postTitle?: string;
  responsibilities?: string[];
  permissionsOverride?: Record<string, boolean>;
  dataScope: UserDataScope;
  emailSentAt?: string;
  emailSentFrom?: string;
  emailDeliveryStatus?: string;
  emailPreviewHtml?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}


export interface AccessRequest {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  provider: 'google' | 'email';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  assignedRoleId?: RoleId;
  assignedProgramIds?: string[];
  assignedEventIds?: string[];
  dataScopePeople?: 'GLOBAL' | 'ORGANIZATION' | 'ASSIGNED' | 'OWN_RECORD';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AuthSession {
  user: {
    id: string; // auth_user_id
    email: string;
    fullName?: string;
    avatarUrl?: string;
    provider: 'google' | 'email';
    emailVerified: boolean;
  };
  accessToken?: string;
  expiresAt?: number;
}

export type AuthState = 
  | 'UNAUTHENTICATED'      // on /login
  | 'AUTHENTICATING'       // OAuth or sign in in progress
  | 'NO_PROFILE'           // verified auth, no CRM record -> /request-access
  | 'PENDING'              // request submitted, waiting for admin -> /pending-approval
  | 'REJECTED'             // rejected by admin -> /access-denied
  | 'SUSPENDED'            // suspended by admin -> /account-suspended
  | 'DISABLED'             // disabled by admin -> /account-disabled
  | 'APPROVED';            // approved & active -> loads CRM

export interface Person {
  id: string;
  name: string;
  avatar?: string;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  email: string;
  phone?: string;
  relationshipTypes: RelationshipType[];
  interests: string[];
  programIds: string[];
  eventIds: string[];
  notes?: string;
  lastInteractionDate?: string;
  nextFollowUpDate?: string;
  mailchimpStatus?: 'subscribed' | 'unsubscribed' | 'pending';
  city?: string;
  province?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  sector: string;
  type: OrgType;
  website: string;
  primaryContactId?: string;
  primaryContactName?: string;
  relationshipTypes: RelationshipType[];
  programsInvolved: string[];
  city?: string;
  province?: string;
  notes?: string;
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  status: ProgramStatus;
  startDate: string;
  endDate: string;
  ownerName: string;
  ownerEmail?: string;
  participantIds: string[];
  partnerIds: string[];
  progressPercent: number;
  focusAreas: string[];
  budgetCad?: number;
  outcomes?: string;
  createdAt: string;
}

export type Task = TaskItem;
export type EventRecord = EventItem;

export type FundingStatus = 'Received' | 'Pledged' | 'Pending Review' | 'Approved' | 'Applied' | 'Prospective';

export interface EventInstructionLog {
  id: string;
  text: string;
  loggedBy: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  category?: 'General' | 'Setup' | 'Run of Show' | 'Accessibility' | 'Logistics' | 'Safety';
}

export interface EventItem {
  id: string;
  name: string;
  type: EventType;
  programId?: string;
  programName?: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  location: string;
  isOnline: boolean;
  meetingLink?: string;
  facilitator: string;
  partnerIds: string[];
  capacity: number;
  description?: string;
  notes?: string;
  instructions?: string;
  instructionLogs?: EventInstructionLog[];
  participants?: ParticipantRecord[];
  createdAt: string;
}

export interface ParticipantRecord {
  id: string;
  personId: string;
  personName: string;
  personEmail: string;
  organizationName?: string;
  eventId?: string;
  eventName?: string;
  programId?: string;
  programName?: string;
  status: ParticipantStatus;
  registeredAt: string;
  attendedAt?: string;
  notes?: string;
}

export type TaskSource = 
  | 'MANUAL' 
  | 'TEMPLATE' 
  | 'RULE' 
  | 'EVENT' 
  | 'PROGRAM' 
  | 'IMPORT' 
  | 'AI_SUGGESTION' 
  | 'SYSTEM';

export type TaskAssignmentMethod = 
  | 'MANUAL' 
  | 'SUGGESTED' 
  | 'AUTOMATIC';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  owner: string; // User Name
  assignedToId?: string; // user id
  assignedPostId?: string;
  assignedPostName?: string;
  organizationId?: string;
  programId?: string;
  programName?: string;
  eventId?: string;
  eventName?: string;
  personId?: string;
  personName?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  source?: TaskSource;
  assignmentMethod?: TaskAssignmentMethod;
  aiGenerated?: boolean;
  aiAssisted?: boolean;
  suggestedReason?: string;
  suggestedAssigneeId?: string;
  suggestedAssigneeName?: string;
  relatedRecordType?: 'Person' | 'Organization' | 'Program' | 'Event' | 'Funding';
  relatedRecordId?: string;
  relatedRecordName?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ------------------------------------------------------------------------------
// FOUR-LAYER EMPLOYEE MODEL & POST HIERARCHY
// ------------------------------------------------------------------------------

export interface Post {
  id: string;
  organizationId: string;
  name: string; // e.g. "Program Coordinator", "Executive Director", "Volunteer Coordinator"
  title?: string;
  description: string;
  responsibilities?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PostResponsibility {
  id: string;
  postId: string;
  name: string; // e.g. "Manage program activities", "Coordinate participants"
  description?: string;
  priority?: 'High' | 'Normal' | 'Low';
  defaultPriority?: 'High' | 'Normal' | 'Low';
  isActive?: boolean;
}

export interface UserPost {
  id: string;
  userId: string;
  postId: string;
  postName?: string;
  startDate: string;
  endDate?: string;
  isPrimary: boolean;
}

export interface TaskTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  postId?: string; // Optional relevant post
  postName?: string;
  defaultPriority: TaskPriority;
  defaultDueDays: number; // e.g. 2 days after event
  relatedEntityType?: 'Event' | 'Program' | 'Person' | 'General';
  isActive: boolean;
  createdAt: string;
}

export type TaskTriggerType = 
  | 'EVENT_COMPLETED' 
  | 'PARTICIPANT_REGISTERED' 
  | 'PARTICIPANT_MISSED' 
  | 'MONTH_END' 
  | 'PROGRAM_STARTED' 
  | 'MANUAL';

export type TaskAssignmentMode = 'Manual' | 'Suggested' | 'Automatic';

export interface TaskAssignmentRule {
  id: string;
  organizationId: string;
  name: string;
  triggerType: TaskTriggerType;
  triggerConditions?: Record<string, any>;
  taskTemplateId: string;
  taskTemplateName?: string;
  postId: string;
  postName?: string;
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;
  assignmentMode: TaskAssignmentMode; // Default: 'Suggested'
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface TaskAssignmentRecord {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  assignedBy: string;
  assignedAt: string;
  isCurrent: boolean;
}

export interface TaskActivityRecord {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  activityType: 
    | 'Assigned' 
    | 'Reassigned' 
    | 'Status Changed' 
    | 'Priority Changed' 
    | 'Due Date Changed' 
    | 'Comment Added' 
    | 'Completed' 
    | 'Reopened' 
    | 'AI Suggested'
    | 'Rule Triggered';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface FundingRecord {
  id: string;
  donorOrFunder: string;
  funderName?: string;
  organizationId?: string;
  organizationName?: string;
  amountCad: number;
  date: string;
  fundingType: FundingType;
  type?: FundingType | string;
  relatedProgramId?: string;
  relatedProgramName?: string;
  programId?: string;
  status: 'Received' | 'Pledged' | 'Pending Review' | 'Approved' | 'Applied' | 'Prospective';
  grantDeliverableNote?: string;
  reportDueDate?: string;
  reportingDeadline?: string;
  fiscalYear?: string;
  notes?: string;
  createdAt: string;
}

export interface InteractionItem {
  id: string;
  personId?: string;
  personName?: string;
  organizationId?: string;
  organizationName?: string;
  type: InteractionType;
  date: string;
  summary: string;
  details?: string;
  authorName: string;
  followUpDate?: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'Google Drive' | 'Google Docs' | 'Google Sheets' | 'Google Slides' | 'Cloud Link' | 'PDF / File';
  url: string;
  relatedType: 'Person' | 'Organization' | 'Program' | 'Event' | 'Funding' | 'General';
  relatedId?: string;
  relatedName?: string;
  addedBy: string;
  addedAt: string;
  description?: string;
  storageKey?: string;
  isCloudFile?: boolean;
  sizeBytes?: number;
  mimeType?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userName: string;
  timestamp: string;
  details?: string;
}

// ==============================================================================
// AI INTELLIGENCE & CSV ANALYTICS TYPES (Section 48-54)
// ==============================================================================

export type InsightType = 
  | 'finding' 
  | 'trend' 
  | 'anomaly' 
  | 'opportunity' 
  | 'risk' 
  | 'recommendation' 
  | 'caveat';

export type AnalysisJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface AnalysisFile {
  id: string;
  organizationId: string;
  uploadedBy: string;
  uploaderName: string;
  filename: string;
  fileType: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  checksum: string;
  createdAt: string;
}

export interface AnalysisJob {
  id: string;
  organizationId: string;
  userId: string;
  fileId: string;
  status: AnalysisJobStatus;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface AnalysisMetric {
  id: string;
  analysisResultId: string;
  metricName: string;
  metricValue: number | string;
  metricType: 'count' | 'sum' | 'average' | 'median' | 'percentage' | 'rate' | 'ratio';
  dimensions?: Record<string, any>;
  createdAt: string;
}

export interface AnalysisInsight {
  id: string;
  analysisResultId: string;
  insightType: InsightType;
  category: 'observed' | 'interpretation' | 'action'; // 3-part grounded separation
  title: string;
  description: string;
  supportingMetrics?: Record<string, any>;
  recommendation?: string;
  createdAt: string;
}

export interface AnalysisResult {
  id: string;
  analysisJobId: string;
  fileId: string;
  filename: string;
  summary: string;
  dataQualitySummary: DataQualityReport;
  calculationVersion: string;
  aiModel: string;
  aiSummary: string;
  metrics: AnalysisMetric[];
  insights: AnalysisInsight[];
  visualizations?: Array<{
    id: string;
    type: 'bar' | 'line' | 'donut' | 'area' | 'kpi' | 'table';
    title: string;
    description: string;
    data: any[];
    xKey?: string;
    yKeys?: string[];
  }>;
  createdAt: string;
}

export interface ColumnProfile {
  name: string;
  inferredType: 'number' | 'date' | 'currency' | 'email' | 'phone' | 'categorical' | 'text' | 'id';
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  sampleValues: string[];
  suggestedMapping?: string;
  min?: number | string;
  max?: number | string;
  mean?: number;
}

export interface DataQualityReport {
  totalRows: number;
  validRows: number;
  validPercentage: number;
  duplicateRows: number;
  duplicateIds: number;
  missingEmails: number;
  invalidDates: number;
  warningsCount: number;
  warnings: string[];
  qualityRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface ColumnMapping {
  csvColumn: string;
  crmField: string;
  confidence: number;
  confirmed: boolean;
}

export interface DeterministicAnalysisResult {
  rowCount: number;
  qualityReport: DataQualityReport;
  mappings: ColumnMapping[];
  kpis: Array<{
    label: string;
    value: string | number;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }>;
  charts: Array<{
    id: string;
    type: 'bar' | 'line' | 'donut' | 'area';
    title: string;
    subtitle?: string;
    data: any[];
    dataKeys: string[];
    labels?: Record<string, string>;
  }>;
  structuredPayloadForAi: {
    summary: string;
    keyMetrics: Record<string, any>;
    groupings: Record<string, any>;
    anomalies: string[];
    dataQualityNotes: string[];
    datasetType?: 'funding' | 'attendance' | 'generic';
    evidence?: any[];
    limitations?: string[];
  };
}

export interface AiRequestLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  feature: 'csv_analysis' | 'natural_language_query' | 'program_summary' | 'event_insights' | 'funding_insights' | 'report_gen';
  requestTimestamp: string;
  model: string;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  latencyMs: number;
  status: 'success' | 'fallback_deterministic' | 'error';
}

export type IntelligenceTier = 'DETERMINISTIC' | 'RULE_BASED' | 'AI_GENERATED';
export type AiPrivacyMode = 'minimal' | 'balanced' | 'expanded';

export interface AiBudgetConfig {
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  perUserLimit: number;
  csvAnalysisLimit: number;
  chatLimit: number;
  reportGenLimit: number;
  privacyMode: AiPrivacyMode;
}

export interface AiUsageStats {
  requestsThisMonth: number;
  requestsToday: number;
  csvAnalysesCount: number;
  dataQuestionsCount: number;
  reportGenerationsCount: number;
  estimatedTokens: number;
  tokensSaved: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  deterministicQueriesAnswered: number;
  apiStatus: 'connected' | 'offline_deterministic' | 'budget_exceeded';
  budgetConfig: AiBudgetConfig;
  lastRequestAt?: string;
  model: string;
  recentLogs?: any[];
}

export interface AiQueryRequest {
  question: string;
  userRole: RoleId;
  dataScope: UserDataScope;
}

export interface AiQueryResponse {
  question: string;
  interpretedIntent: string;
  authorized: boolean;
  refusalReason?: string;
  calculationFact: string;
  aiExplanation: string;
  suggestedAction?: string;
  relevantMetrics?: Record<string, any>;
}

// ------------------------------------------------------------------------------
// TIP INTELLIGENCE — PROACTIVE AI WORK INTELLIGENCE CHATBOT
// ------------------------------------------------------------------------------

export type AiSuggestionSeverity = 'Critical' | 'Important' | 'Suggested' | 'Informational';
export type AiSuggestionCategory = 'For You' | 'Organization' | 'Workflow' | 'Data';
export type AiSuggestionStatus = 'new' | 'seen' | 'accepted' | 'dismissed' | 'snoozed' | 'completed' | 'expired';

export type AiSuggestionType = 
  | 'task_overdue'
  | 'unassigned_task'
  | 'event_prep'
  | 'participant_followup'
  | 'workload_concentration'
  | 'stale_relationship'
  | 'duplicate_record'
  | 'automation_rule'
  | 'report_due'
  | 'attendance_drop'
  | 'incomplete_attendance';

export type AiActionType = 
  | 'create_tasks' 
  | 'assign_task' 
  | 'complete_task' 
  | 'create_rule' 
  | 'log_interaction';

export interface AiActionPreview {
  id: string;
  title: string;
  description: string;
  actionType: AiActionType;
  targetRecordType?: 'Task' | 'Event' | 'Program' | 'Person' | 'Rule' | 'Organization';
  targetRecordId?: string;
  targetRecordName?: string;
  payload: any;
  requiresConfirmation: boolean;
}

export interface AiSuggestion {
  id: string;
  organizationId: string;
  userId?: string; // target user id, or undefined for org-wide
  targetPostId?: string;
  targetPostName?: string;
  category: AiSuggestionCategory;
  suggestionType: AiSuggestionType;
  title: string;
  description: string;
  observed: string; // 1. OBSERVED: What the system knows (factual grounded data)
  interpretation: string; // 2. INTERPRETATION: What the pattern may mean
  suggestion: string; // 3. SUGGESTION: What the user could consider doing
  severity: AiSuggestionSeverity;
  supportingData: Record<string, string | number>;
  actionPreview?: AiActionPreview;
  status: AiSuggestionStatus;
  userFeedback?: 'useful' | 'not_useful';
  suggestionHash?: string;
  tier?: IntelligenceTier;
  cached?: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface AiBehaviorSnapshot {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  postId?: string;
  postTitle?: string;
  roleId: RoleId;
  period: string; // e.g. "Last 7 days"
  metrics: {
    openTaskCount: number;
    overdueTaskCount: number;
    completedTaskCount: number;
    avgCompletionDays: number;
    reassignmentCount: number;
    upcomingEventCount: number;
    pendingFollowupsCount: number;
    attendanceRate: number;
    unassignedTaskCount: number;
    staleContactCount: number;
    dataQualityIssuesCount: number;
  };
  createdAt: string;
}

export interface AiConversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  contextType?: 'dashboard' | 'program' | 'event' | 'task' | 'people' | 'reports';
  contextRecordId?: string;
  contextRecordName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedActions?: Array<{
    label: string;
    action: string;
    payload?: any;
  }>;
  supportingData?: Record<string, any>;
  actionPreview?: AiActionPreview;
  tier?: IntelligenceTier;
  cached?: boolean;
  tokensUsed?: number;
  source?: string;
  budgetExceeded?: boolean;
  timestamp: string;
}

export interface AiActionRecord {
  id: string;
  organizationId: string;
  conversationId?: string;
  userId: string;
  userName: string;
  actionType: AiActionType;
  targetType: string;
  targetId?: string;
  status: 'preview' | 'confirmed' | 'cancelled' | 'executed';
  details: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface AiUserSettings {
  aiEnabled?: boolean;
  suggestionsEnabled: boolean;
  dailyBriefEnabled: boolean;
  workflowSuggestionsEnabled: boolean;
  taskSuggestionsEnabled: boolean;
  notificationsThreshold?: string;
}

export type NavTab = 
  | 'dashboard' 
  | 'people' 
  | 'organizations' 
  | 'programs' 
  | 'events' 
  | 'tasks' 
  | 'funding' 
  | 'reports' 
  | 'documents' 
  | 'intelligence'
  | 'settings';

export interface UserSessionRecord {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string;
  logoutAt?: string;
  lastActiveAt: string;
  durationSeconds: number;
  durationFormatted: string;
  status: 'active' | 'logged_out' | 'terminated';
  ipAddress?: string;
  deviceInfo?: string;
}

export interface UserSessionSummary {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  avatarUrl?: string;
  totalSessions: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  lastLoginAt: string;
  lastLogoutAt?: string;
  status: 'active' | 'offline';
  averageSessionFormatted: string;
}

export interface UserSessionStats {
  activeUsersCount: number;
  totalSessionsCount: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  averageDurationFormatted: string;
}


