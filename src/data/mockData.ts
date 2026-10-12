import { 
  Person, 
  Organization, 
  Program, 
  Project,
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
    id: 'u-1',
    authUserId: 'auth-ruth-001',
    organizationId: 'org-tip',
    name: 'Ruth Mojeed Ramirez',
    email: 'ruth@theinclusionproject.com',
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
    avatarInitials: 'RM',
    status: 'approved',
    isActive: true,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: false,
    onboardingCompleted: true,
    provider: 'google',
    approvedBy: 'System Seed',
    approvedAt: '2025-01-01T00:00:00Z',
    assignedProgramIds: ['prog-1', 'prog-2', 'prog-3'],
    assignedEventIds: ['evt-1', 'evt-2', 'evt-3', 'evt-4'],
    dataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'ALL'
    },
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: '2026-09-18T05:40:00Z'
  },
  {
    id: 'u-2',
    authUserId: 'auth-marcus-002',
    organizationId: 'org-tip',
    name: 'Marcus Chen',
    email: 'marcus.chen@inclusionproject.ca',
    phone: '+1 (604) 555-0142',
    roleId: 'staff_manager',
    role: 'staff',
    assignedRoleIds: ['staff_manager'],
    activeRoleId: 'staff_manager',
    title: 'Operations & Programs Manager',
    postId: 'post-pm',
    postTitle: 'Program Manager',
    responsibilities: [
      'Oversee coordinator work & project delivery',
      'Monthly and quarterly program reports',
      'Grant deliverable and milestone tracking',
      'Cohort milestone reviews and evaluations'
    ],
    avatarInitials: 'MC',
    status: 'approved',
    isActive: true,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: false,
    onboardingCompleted: true,
    provider: 'email',
    approvedBy: 'Ruth Mojeed Ramirez',
    approvedAt: '2025-02-01T09:00:00Z',
    assignedProgramIds: ['prog-1', 'prog-2', 'prog-3'],
    assignedEventIds: ['evt-1', 'evt-2', 'evt-3'],
    dataScope: {
      people: 'GLOBAL',
      programs: 'ALL',
      events: 'ALL',
      funding: 'VIEW'
    },
    createdAt: '2025-02-01T09:00:00Z',
    lastLogin: '2026-09-17T16:45:00Z'
  },
  {
    id: 'u-3',
    authUserId: 'auth-sarah-003',
    organizationId: 'org-tip',
    name: 'Sarah Thompson',
    email: 'sarah.thompson@inclusionproject.ca',
    phone: '+1 (416) 555-0192',
    roleId: 'program_coordinator',
    role: 'staff',
    assignedRoleIds: ['program_coordinator', 'event_coordinator'],
    activeRoleId: 'program_coordinator',
    title: 'Youth Program Coordinator',
    postId: 'post-pc',
    postTitle: 'Program Coordinator',
    responsibilities: [
      'Manage day-to-day program activities',
      'Coordinate cohort participants and outreach',
      'Lead workshop and event logistics',
      'Track attendance and manage honoraria eligibility',
      'Execute follow-up check-ins within 48 hours'
    ],
    avatarInitials: 'ST',
    status: 'approved',
    isActive: true,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: false,
    onboardingCompleted: true,
    provider: 'google',
    approvedBy: 'Ruth Mojeed Ramirez',
    approvedAt: '2025-03-10T10:15:00Z',
    assignedProgramIds: ['prog-1', 'prog-2'],
    assignedEventIds: ['evt-1', 'evt-2'],
    dataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    createdAt: '2025-03-10T10:15:00Z',
    lastLogin: '2026-09-18T08:20:00Z'
  },
  {
    id: 'u-4',
    authUserId: 'auth-jordan-004',
    organizationId: 'org-tip',
    name: 'Jordan Patel',
    email: 'jordan.volunteer@inclusionproject.ca',
    phone: '+1 (604) 555-0188',
    roleId: 'volunteer',
    role: 'volunteer',
    assignedRoleIds: ['volunteer'],
    activeRoleId: 'volunteer',
    title: 'Community Workshop Facilitator (Volunteer)',
    postId: 'post-vol',
    postTitle: 'Volunteer',
    responsibilities: [
      'Event registration check-in support',
      'Participant welcome and materials distribution',
      'Workshop breakout note-taking'
    ],
    avatarInitials: 'JP',
    status: 'approved',
    isActive: true,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: false,
    onboardingCompleted: true,
    provider: 'google',
    approvedBy: 'Marcus Chen',
    approvedAt: '2025-05-12T14:00:00Z',
    assignedProgramIds: ['prog-1'],
    assignedEventIds: ['evt-1'],
    dataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    createdAt: '2025-05-12T14:00:00Z',
    lastLogin: '2026-09-16T11:00:00Z'
  },
  {
    id: 'u-5',
    authUserId: 'auth-elena-005',
    organizationId: 'org-tip',
    name: 'Elena Rostova',
    email: 'elena.rostova@gmail.com',
    phone: '+1 (416) 555-0177',
    roleId: 'staff_member',
    role: 'staff',
    assignedRoleIds: ['staff_member'],
    activeRoleId: 'staff_member',
    title: 'Applicant (Access Pending)',
    avatarInitials: 'ER',
    status: 'pending',
    isActive: false,
    emailVerified: true,
    adminApproved: false,
    mustChangePassword: false,
    onboardingCompleted: false,
    provider: 'google',
    requestedAt: '2026-09-18T04:30:00Z',
    assignedProgramIds: ['prog-1'],
    assignedEventIds: ['evt-1'],
    dataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    createdAt: '2026-09-18T04:30:00Z'
  },
  {
    id: 'u-6',
    authUserId: 'auth-david-006',
    organizationId: 'org-tip',
    name: 'David Kalu',
    email: 'david.kalu@gmail.com',
    roleId: 'volunteer',
    role: 'volunteer',
    assignedRoleIds: ['volunteer'],
    activeRoleId: 'volunteer',
    title: 'Applicant (Rejected)',
    avatarInitials: 'DK',
    status: 'rejected',
    isActive: false,
    emailVerified: true,
    adminApproved: false,
    mustChangePassword: false,
    onboardingCompleted: false,
    provider: 'google',
    requestedAt: '2026-09-15T11:20:00Z',
    rejectionReason: 'User is not currently associated with TIP active programs.',
    assignedProgramIds: [],
    assignedEventIds: [],
    dataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    createdAt: '2026-09-15T11:20:00Z'
  },
  {
    id: 'u-7',
    authUserId: 'auth-alex-007',
    organizationId: 'org-tip',
    name: 'Alex Mercer',
    email: 'alex.mercer@gmail.com',
    roleId: 'staff_member',
    role: 'staff',
    assignedRoleIds: ['staff_member'],
    activeRoleId: 'staff_member',
    title: 'Former Coordinator (Disabled)',
    avatarInitials: 'AM',
    status: 'disabled',
    isActive: false,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: false,
    onboardingCompleted: false,
    provider: 'email',
    assignedProgramIds: [],
    assignedEventIds: [],
    dataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    createdAt: '2025-04-10T10:00:00Z'
  },
  {
    id: 'u-8',
    authUserId: 'auth-chloe-008',
    organizationId: 'org-tip',
    name: 'Chloe Vance',
    email: 'chloe.vance@inclusionproject.ca',
    phone: '+1 (604) 555-0199',
    roleId: 'program_coordinator',
    role: 'staff',
    assignedRoleIds: ['program_coordinator', 'event_coordinator'],
    activeRoleId: 'program_coordinator',
    title: 'Program Coordinator',
    postId: 'post-pc',
    postTitle: 'Program Coordinator',
    responsibilities: [
      'Support youth program sessions',
      'Track participant registration and attendance',
      'Follow up on post-workshop surveys'
    ],
    avatarInitials: 'CV',
    status: 'approved',
    isActive: true,
    emailVerified: true,
    adminApproved: true,
    mustChangePassword: true,
    tempPassword: 'TempPassword123!',
    onboardingCompleted: false,
    provider: 'email',
    approvedBy: 'Ruth Mojeed Ramirez',
    approvedAt: '2026-09-23T10:00:00Z',
    assignedProgramIds: ['prog-1', 'prog-2'],
    assignedEventIds: ['evt-1'],
    dataScope: {
      people: 'ASSIGNED',
      programs: 'ASSIGNED',
      events: 'ASSIGNED',
      funding: 'NONE'
    },
    createdAt: '2026-09-23T10:00:00Z',
    lastLogin: undefined
  }
];

export const INITIAL_ACCESS_REQUESTS = [
  {
    id: 'req-1',
    authUserId: 'auth-elena-005',
    email: 'elena.rostova@gmail.com',
    fullName: 'Elena Rostova',
    provider: 'google' as const,
    requestedAt: '2026-09-18T04:30:00Z',
    status: 'pending' as const,
    notes: 'Applying to support Canadian Youth Leadership Cohort and Community Forums.',
    assignedRoleId: 'staff_member' as const,
    assignedProgramIds: ['prog-1'],
    assignedEventIds: ['evt-1'],
    dataScopePeople: 'ASSIGNED' as const
  }
];

export const INITIAL_PEOPLE: Person[] = [
  {
    id: 'p-1',
    name: 'Sarah Thompson',
    role: 'Program Facilitator & Youth Advocate',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    email: 'sarah.thompson@bcya.ca',
    phone: '+1 (416) 555-0192',
    relationshipTypes: ['Facilitator', 'Partner', 'Stakeholder'],
    interests: ['Youth Civic Engagement', 'Racial Equity', 'Workshop Facilitation'],
    programIds: ['prog-1'],
    eventIds: ['evt-1', 'evt-2'],
    notes: 'Led the Toronto summer youth cohort. Extremely reliable and trusted by community participants.',
    lastInteractionDate: '2026-09-17',
    nextFollowUpDate: '2026-09-22',
    mailchimpStatus: 'subscribed',
    city: 'Toronto',
    province: 'ON',
    createdAt: '2026-02-14'
  },
  {
    id: 'p-2',
    name: 'Dr. Fatima Al-Mansoor',
    role: 'Senior Research Fellow',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School / Policy Research',
    email: 'f.almansoor@utoronto.ca',
    phone: '+1 (416) 978-4021',
    relationshipTypes: ['Advisor', 'Stakeholder'],
    interests: ['Systems Policy', 'Equity Metrics', 'Accessibility Governance'],
    programIds: ['prog-3'],
    eventIds: ['evt-3'],
    notes: 'Advising on our 2026 Nonprofit Governance and Inclusion Index paper. Reviewed draft methodology.',
    lastInteractionDate: '2026-09-14',
    nextFollowUpDate: '2026-09-28',
    mailchimpStatus: 'subscribed',
    city: 'Toronto',
    province: 'ON',
    createdAt: '2026-01-20'
  },
  {
    id: 'p-3',
    name: 'David O\'Connor',
    role: 'Program Director, Community Grants',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    email: 'doconnor@otf.ca',
    phone: '+1 (416) 963-4920',
    relationshipTypes: ['Funder / Donor'],
    interests: ['Capacity Building', 'Digital Accessibility', 'Civic Infrastructure'],
    programIds: ['prog-2'],
    eventIds: ['evt-3'],
    notes: 'Lead contact for our Seed and Grow grant stream. Met at the Philanthropy Roundtable.',
    lastInteractionDate: '2026-09-08',
    nextFollowUpDate: '2026-09-25',
    mailchimpStatus: 'subscribed',
    city: 'Toronto',
    province: 'ON',
    createdAt: '2026-01-10'
  },
  {
    id: 'p-4',
    name: 'Kendra Redsky',
    role: 'Community Outreach Lead',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    email: 'kendra@accessibilitynetwork.ca',
    phone: '+1 (647) 555-8321',
    relationshipTypes: ['Partner', 'Participant'],
    interests: ['Universal Design', 'ASL & Plain Language', 'Disability Justice'],
    programIds: ['prog-2'],
    eventIds: ['evt-1', 'evt-4'],
    notes: 'Key partner for co-designing physical and digital accessibility audits for community centers.',
    lastInteractionDate: '2026-09-15',
    nextFollowUpDate: '2026-09-20',
    mailchimpStatus: 'subscribed',
    city: 'Toronto',
    province: 'ON',
    createdAt: '2026-03-05'
  },
  {
    id: 'p-5',
    name: 'Elena Rostova',
    role: 'Senior Philanthropy Officer',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    email: 'elena.rostova@pch.gc.ca',
    phone: '+1 (613) 997-0055',
    relationshipTypes: ['Funder / Donor', 'Stakeholder'],
    interests: ['Multiculturalism Funding', 'Community Anti-Racism', 'Federal Support'],
    programIds: ['prog-1', 'prog-3'],
    eventIds: ['evt-3'],
    notes: 'Primary liaison for the Federal Anti-Racism Action Program grant agreement.',
    lastInteractionDate: '2026-08-29',
    nextFollowUpDate: '2026-10-01',
    mailchimpStatus: 'subscribed',
    city: 'Ottawa',
    province: 'ON',
    createdAt: '2026-01-15'
  },
  {
    id: 'p-6',
    name: 'Tariq Hassan',
    role: 'Undergraduate Youth Participant',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    email: 'tariq.h@gmail.com',
    phone: '+1 (647) 555-9012',
    relationshipTypes: ['Participant', 'Volunteer'],
    interests: ['Civic Leadership', 'Community Organizing', 'Peer Mentorship'],
    programIds: ['prog-1'],
    eventIds: ['evt-1'],
    notes: 'Completed Module 1 of Youth Leadership. Volunteer peer facilitator for upcoming session.',
    lastInteractionDate: '2026-09-11',
    mailchimpStatus: 'subscribed',
    city: 'Mississauga',
    province: 'ON',
    createdAt: '2026-05-18'
  },
  {
    id: 'p-7',
    name: 'Amélie Tremblay',
    role: 'Accessibility Compliance Coordinator',
    organizationId: 'org-6',
    organizationName: 'Montreal Civic Inclusion Hub',
    email: 'a.tremblay@inclusionsociete.qc.ca',
    phone: '+1 (514) 872-3100',
    relationshipTypes: ['Partner', 'Advisor'],
    interests: ['Bilingual Standards', 'Web Content Accessibility', 'Quebec Nonprofits'],
    programIds: ['prog-2'],
    eventIds: ['evt-4'],
    notes: 'Partner for our cross-provincial accessibility tool localization initiative.',
    lastInteractionDate: '2026-09-02',
    nextFollowUpDate: '2026-10-15',
    mailchimpStatus: 'pending',
    city: 'Montreal',
    province: 'QC',
    createdAt: '2026-04-10'
  }
];

export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-1',
    name: 'Ontario Trillium Foundation',
    sector: 'Philanthropy & Grantmaking',
    type: 'Funder',
    website: 'https://otf.ca',
    primaryContactId: 'p-3',
    primaryContactName: 'David O\'Connor',
    relationshipTypes: ['Funder / Donor'],
    programsInvolved: ['prog-2'],
    city: 'Toronto',
    province: 'ON',
    notes: 'Supporting TIP’s Civic Accessibility & Digital Inclusion Lab via 2-year Seed Grant.',
    createdAt: '2026-01-10'
  },
  {
    id: 'org-2',
    name: 'Department of Canadian Heritage',
    sector: 'Federal Government',
    type: 'Government Organization',
    website: 'https://www.canada.ca/en/canadian-heritage.html',
    primaryContactId: 'p-5',
    primaryContactName: 'Elena Rostova',
    relationshipTypes: ['Funder / Donor', 'Stakeholder'],
    programsInvolved: ['prog-1', 'prog-3'],
    city: 'Ottawa',
    province: 'ON',
    notes: 'Funding Anti-Racism & Youth Civic Engagement initiatives through Multi-Year Program Contribution.',
    createdAt: '2026-01-15'
  },
  {
    id: 'org-3',
    name: 'Toronto Accessibility Network',
    sector: 'Community Advocacy & Disability Justice',
    type: 'Community Organization',
    website: 'https://accessibilitynetwork.ca',
    primaryContactId: 'p-4',
    primaryContactName: 'Kendra Redsky',
    relationshipTypes: ['Partner'],
    programsInvolved: ['prog-2'],
    city: 'Toronto',
    province: 'ON',
    notes: 'Co-hosting regular accessibility labs and community feedback consultations.',
    createdAt: '2026-03-05'
  },
  {
    id: 'org-4',
    name: 'Black Canadian Youth Alliance',
    sector: 'Youth Empowerment & Civil Rights',
    type: 'Partner',
    website: 'https://bcya.ca',
    primaryContactId: 'p-1',
    primaryContactName: 'Sarah Thompson',
    relationshipTypes: ['Partner'],
    programsInvolved: ['prog-1'],
    city: 'Toronto',
    province: 'ON',
    notes: 'Community mobilization partner for recruitment, venue co-hosting, and peer curriculum review.',
    createdAt: '2026-02-14'
  },
  {
    id: 'org-5',
    name: 'U of T School of Public Policy & Governance',
    sector: 'Higher Education & Research',
    type: 'University',
    website: 'https://munkschool.utoronto.ca',
    primaryContactId: 'p-2',
    primaryContactName: 'Dr. Fatima Al-Mansoor',
    relationshipTypes: ['Advisor', 'Partner'],
    programsInvolved: ['prog-3'],
    city: 'Toronto',
    province: 'ON',
    notes: 'Academic research collaboration on our Canadian Nonprofit Inclusion & Board Diversity Benchmark.',
    createdAt: '2026-01-20'
  },
  {
    id: 'org-6',
    name: 'Montreal Civic Inclusion Hub',
    sector: 'Social Economy & Inclusion',
    type: 'Partner',
    website: 'https://inclusionsociete.qc.ca',
    primaryContactId: 'p-7',
    primaryContactName: 'Amélie Tremblay',
    relationshipTypes: ['Partner'],
    programsInvolved: ['prog-2'],
    city: 'Montreal',
    province: 'QC',
    notes: 'Quebec regional partner for bilingual accessibility guidelines.',
    createdAt: '2026-04-10'
  }
];

export const INITIAL_PROGRAMS: Program[] = [
  {
    id: 'prog-1',
    name: 'Employment Equity Partnership (EEP)',
    description: 'A public-private sector partnership delivering data-driven solutions to systemic racism and inequitable employment in Canada. Utilizes Workplace Equity Scorecards (WES) to benchmark diversity and develop pathways for Indigenous, Black, and racialized talents.',
    status: 'Active',
    startDate: '2026-04-01',
    endDate: '2026-11-30',
    ownerName: 'Marcus Chen',
    ownerEmail: 'marcus.chen@inclusionproject.ca',
    participantIds: ['p-1', 'p-6'],
    partnerIds: ['org-4', 'org-2'],
    projectIds: ['proj-1', 'proj-2'],
    progressPercent: 78,
    focusAreas: ['Employment Equity', 'Workplace Scorecards', 'Workforce Diversity'],
    budgetCad: 125000,
    outcomes: '40 Workplace Equity Scorecards completed; 12 corporate employer cohorts engaged; national benchmarking report published.',
    createdAt: '2026-02-01'
  },
  {
    id: 'prog-2',
    name: 'Youth-Led Community of Practice (YCoP)',
    description: 'A shared learning and advocacy platform for youth and allies to collectively address Racial Equity at its intersecting roots in Climate Justice, Decolonization, and Mental Health through a Design Justice lens.',
    status: 'Active',
    startDate: '2026-01-15',
    endDate: '2026-12-31',
    ownerName: 'Maya Lin',
    ownerEmail: 'maya.lin@inclusionproject.ca',
    participantIds: ['p-4', 'p-7'],
    partnerIds: ['org-1', 'org-3', 'org-6'],
    projectIds: ['proj-3'],
    progressPercent: 64,
    focusAreas: ['Youth Leadership', 'Climate Justice', 'Design Justice'],
    budgetCad: 85000,
    outcomes: '120 youth practitioners trained; 4 community action labs conducted; open-access youth design justice toolkit released.',
    createdAt: '2026-01-05'
  },
  {
    id: 'prog-3',
    name: 'REDI Framework Solutions (Racial Equity, Diversity & Inclusion)',
    description: 'Our proprietary service offering to support multi-level and multi-sector Canadian organizations in understanding and advancing racial inclusion through baseline assessments, intersectional data analytics, and action planning.',
    status: 'Active',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    ownerName: 'Maya Lin',
    ownerEmail: 'maya.lin@inclusionproject.ca',
    participantIds: ['p-2'],
    partnerIds: ['org-5', 'org-2'],
    projectIds: ['proj-4'],
    progressPercent: 52,
    focusAreas: ['REDI Baseline Assessment', 'Intersectional Analytics', 'Systems Change'],
    budgetCad: 95000,
    outcomes: '25 organizational REDI audits; 8 institutional action roadmaps adopted; 450 executives & leaders trained.',
    createdAt: '2026-02-15'
  },
  {
    id: 'prog-4',
    name: 'EEP Partners’ Roundtable Series & National Summits',
    description: 'National executive convening bringing together corporate employers, civil society organizations, tech innovators, and healthcare institutions to address systemic labour barriers.',
    status: 'Planning',
    startDate: '2026-10-15',
    endDate: '2027-04-30',
    ownerName: 'Marcus Chen',
    ownerEmail: 'marcus.chen@inclusionproject.ca',
    participantIds: [],
    partnerIds: ['org-4'],
    projectIds: [],
    progressPercent: 20,
    focusAreas: ['Executive Summits', 'Multi-Sector Partnerships', 'Policy Briefs'],
    budgetCad: 60000,
    outcomes: 'Annual national partners roundtable in Toronto & Vancouver; ministerial policy recommendations presented.',
    createdAt: '2026-08-10'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    programId: 'prog-1',
    programName: 'Employment Equity Partnership (EEP)',
    name: 'Workplace Equity Scorecard (WES) 2026 Cohort',
    description: 'Data collection, organizational audit, and benchmarking for 12 corporate employer partners.',
    status: 'Active',
    ownerName: 'Marcus Chen',
    startDate: '2026-04-15',
    endDate: '2026-09-30',
    participantIds: ['p-1', 'p-6'],
    createdAt: '2026-04-01'
  },
  {
    id: 'proj-2',
    programId: 'prog-1',
    programName: 'Employment Equity Partnership (EEP)',
    name: 'Racialized Talent Career Pathways Pilot',
    description: 'Mentorship and leadership accelerator connecting Black and Indigenous professionals with senior executives.',
    status: 'Active',
    ownerName: 'Marcus Chen',
    startDate: '2026-05-01',
    endDate: '2026-11-15',
    participantIds: ['p-1'],
    createdAt: '2026-04-20'
  },
  {
    id: 'proj-3',
    programId: 'prog-2',
    programName: 'Youth-Led Community of Practice (YCoP)',
    name: 'Youth Climate & Design Justice Lab',
    description: 'Bi-weekly collaborative workshops for 40 young leaders on climate equity and grassroots organizing.',
    status: 'Active',
    ownerName: 'Maya Lin',
    startDate: '2026-02-01',
    endDate: '2026-08-31',
    participantIds: ['p-4', 'p-7'],
    createdAt: '2026-01-20'
  },
  {
    id: 'proj-4',
    programId: 'prog-3',
    programName: 'REDI Framework Solutions (Racial Equity, Diversity & Inclusion)',
    name: 'Municipal Institutional REDI Audit',
    description: 'Comprehensive equity audit and policy review for municipal government partners in Ontario.',
    status: 'Active',
    ownerName: 'Maya Lin',
    startDate: '2026-03-15',
    endDate: '2026-10-31',
    participantIds: ['p-2'],
    createdAt: '2026-03-01'
  }
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    name: 'Community Accessibility & Plain Language Workshop',
    type: 'Workshop',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    date: '2026-09-24',
    time: '13:00 - 15:30 EDT',
    location: 'Centre for Social Innovation (Spadina) & Zoom Hybrid',
    isOnline: false,
    meetingLink: 'https://inclusionproject.zoom.us/j/948271049',
    facilitator: 'Kendra Redsky & Maya Lin',
    partnerIds: ['org-3'],
    capacity: 50,
    notes: 'ASL interpreters confirmed. CART live captioning booked. Pre-workshop accessibility survey closed.',
    createdAt: '2026-08-20'
  },
  {
    id: 'evt-2',
    name: 'Youth Civic Policy & Deputation Lab',
    type: 'Youth Lab',
    programId: 'prog-1',
    programName: 'Youth Leadership & Civic Equity Initiative',
    date: '2026-09-29',
    time: '17:30 - 19:45 EDT',
    location: 'Regent Park Community Centre (Room 204)',
    isOnline: false,
    facilitator: 'Sarah Thompson & Marcus Chen',
    partnerIds: ['org-4'],
    capacity: 25,
    notes: 'Transit tokens and hot dinner provided. Youth will practice delivering 3-minute deputation remarks.',
    createdAt: '2026-09-01'
  },
  {
    id: 'evt-3',
    name: 'National Funder Roundtable on Equity-Based Metrics',
    type: 'Panel',
    programId: 'prog-3',
    programName: 'Systems-Level Racial Equity in Nonprofits Research',
    date: '2026-10-08',
    time: '10:00 - 12:00 EDT',
    location: 'Virtual National Briefing (Zoom Webinar)',
    isOnline: true,
    meetingLink: 'https://inclusionproject.zoom.us/j/847291038',
    facilitator: 'Maya Lin & Dr. Fatima Al-Mansoor',
    partnerIds: ['org-1', 'org-2', 'org-5'],
    capacity: 100,
    notes: 'Invitation-only briefing for grant officers and foundation trustees.',
    createdAt: '2026-09-05'
  },
  {
    id: 'evt-4',
    name: 'Cross-Canada Digital Inclusion Tooling Consultation',
    type: 'Consultation',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    date: '2026-10-22',
    time: '14:00 - 16:00 EDT',
    location: 'Online Workshop & Miro Board',
    isOnline: true,
    meetingLink: 'https://inclusionproject.zoom.us/j/572910482',
    facilitator: 'Amélie Tremblay & Marcus Chen',
    partnerIds: ['org-6', 'org-3'],
    capacity: 40,
    notes: 'Bilingual session with simultaneous French/English audio interpretation channel.',
    createdAt: '2026-09-10'
  }
];

export const INITIAL_PARTICIPANTS: ParticipantRecord[] = [
  {
    id: 'pt-1',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    personEmail: 'sarah.thompson@bcya.ca',
    organizationName: 'Black Canadian Youth Alliance',
    eventId: 'evt-1',
    eventName: 'Community Accessibility & Plain Language Workshop',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    status: 'Attended',
    registeredAt: '2026-08-25',
    attendedAt: '2026-09-24',
    notes: 'Assisted with small group breakout facilitation.'
  },
  {
    id: 'pt-2',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    personEmail: 'kendra@accessibilitynetwork.ca',
    organizationName: 'Toronto Accessibility Network',
    eventId: 'evt-1',
    eventName: 'Community Accessibility & Plain Language Workshop',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    status: 'Registered',
    registeredAt: '2026-08-22',
    notes: 'Co-lead facilitator.'
  },
  {
    id: 'pt-3',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    personEmail: 'tariq.h@gmail.com',
    organizationName: 'Black Canadian Youth Alliance',
    eventId: 'evt-2',
    eventName: 'Youth Civic Policy & Deputation Lab',
    programId: 'prog-1',
    programName: 'Youth Leadership & Civic Equity Initiative',
    status: 'Registered',
    registeredAt: '2026-09-05',
    notes: 'Confirmed attendance; dietary preference vegetarian.'
  },
  {
    id: 'pt-4',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    personEmail: 'f.almansoor@utoronto.ca',
    organizationName: 'U of T Munk School',
    eventId: 'evt-3',
    eventName: 'National Funder Roundtable on Equity-Based Metrics',
    programId: 'prog-3',
    programName: 'Systems-Level Racial Equity in Nonprofits Research',
    status: 'Registered',
    registeredAt: '2026-09-08',
    notes: 'Presenting research framework slides.'
  },
  {
    id: 'pt-5',
    personId: 'p-3',
    personName: 'David O\'Connor',
    personEmail: 'doconnor@otf.ca',
    organizationName: 'Ontario Trillium Foundation',
    eventId: 'evt-3',
    eventName: 'National Funder Roundtable on Equity-Based Metrics',
    programId: 'prog-3',
    programName: 'Systems-Level Racial Equity in Nonprofits Research',
    status: 'Registered',
    registeredAt: '2026-09-09',
    notes: 'Panel respondent representing provincial public funders.'
  },
  {
    id: 'pt-6',
    personId: 'p-7',
    personName: 'Amélie Tremblay',
    personEmail: 'a.tremblay@inclusionsociete.qc.ca',
    organizationName: 'Montreal Civic Inclusion Hub',
    eventId: 'evt-4',
    eventName: 'Cross-Canada Digital Inclusion Tooling Consultation',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    status: 'Registered',
    registeredAt: '2026-09-12',
    notes: 'Co-moderator for francophone participant stream.'
  }
];

// ------------------------------------------------------------------------------
// FOUR-LAYER EMPLOYEE MODEL & POST HIERARCHY SEED DATA
// ------------------------------------------------------------------------------

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
    id: 'post-res',
    organizationId: 'org-tip',
    name: 'Research Coordinator',
    description: 'AREDI+ benchmark studies, qualitative and quantitative survey design, and policy briefs.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-fin',
    organizationId: 'org-tip',
    name: 'Finance Officer',
    description: 'Grant budget reconciliation, expense categorization, financial audits, and funder claim submissions.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-vol-coord',
    organizationId: 'org-tip',
    name: 'Volunteer Coordinator',
    description: 'Volunteer recruitment, onboarding, scheduling, and community event station assignments.',
    isActive: true,
    createdAt: '2025-01-01'
  },
  {
    id: 'post-vol',
    organizationId: 'org-tip',
    name: 'Volunteer',
    description: 'Community-facing event support, registration desk check-ins, welcoming participants, and breakout note-taking.',
    isActive: true,
    createdAt: '2025-01-01'
  }
];

export const INITIAL_POST_RESPONSIBILITIES: PostResponsibility[] = [
  // Executive Director
  { id: 'pr-1', postId: 'post-ed', name: 'Strategic Leadership', description: 'Guide organization mission, growth, and cross-sector coalitions.', priority: 'High' },
  { id: 'pr-2', postId: 'post-ed', name: 'Board Governance & Fiduciary', description: 'Ensure legal, financial, and regulatory compliance across Canadian operations.', priority: 'High' },
  { id: 'pr-3', postId: 'post-ed', name: 'Philanthropic Partnerships', description: 'Lead major donor stewardship and multi-year institutional funding.', priority: 'High' },
  
  // Program Manager
  { id: 'pr-4', postId: 'post-pm', name: 'Program Delivery Oversight', description: 'Ensure all program milestones and grant deliverables meet targets.', priority: 'High' },
  { id: 'pr-5', postId: 'post-pm', name: 'Monthly Program Reporting', description: 'Synthesize data into monthly executive and board reports.', priority: 'High' },
  { id: 'pr-6', postId: 'post-pm', name: 'Workload & Team Allocation', description: 'Manage task distribution and support Program Coordinators.', priority: 'Normal' },

  // Program Coordinator
  { id: 'pr-7', postId: 'post-pc', name: 'Manage Program Activities', description: 'Coordinate weekly workshops, youth cohorts, and speaker arrangements.', priority: 'High' },
  { id: 'pr-8', postId: 'post-pc', name: 'Coordinate Participants', description: 'Manage onboarding, access requirements, and honoraria distribution.', priority: 'High' },
  { id: 'pr-9', postId: 'post-pc', name: 'Coordinate Events', description: 'Oversee venue setup, AV/ASL accessibility, and online streaming links.', priority: 'Normal' },
  { id: 'pr-10', postId: 'post-pc', name: 'Track Attendance', description: 'Record real-time attendee data and flag drop-offs for engagement.', priority: 'Normal' },
  { id: 'pr-11', postId: 'post-pc', name: 'Complete Follow-ups', description: 'Execute 48-hour follow-up surveys and resource distribution.', priority: 'Normal' },

  // Volunteer
  { id: 'pr-12', postId: 'post-vol', name: 'Participant Registration & Check-in', description: 'Greet community members and record attendance on check-in tablet.', priority: 'Normal' },
  { id: 'pr-13', postId: 'post-vol', name: 'Workshop Logistics & Breakouts', description: 'Distribute discussion toolkits and record breakout group notes.', priority: 'Normal' }
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
    defaultAssigneeId: 'u-3',
    defaultAssigneeName: 'Sarah Thompson',
    assignmentMode: 'Suggested',
    isActive: true,
    createdBy: 'Ruth Mojeed Ramirez',
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
    defaultAssigneeId: 'u-3',
    defaultAssigneeName: 'Sarah Thompson',
    assignmentMode: 'Suggested',
    isActive: true,
    createdBy: 'Ruth Mojeed Ramirez',
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
    defaultAssigneeId: 'u-2',
    defaultAssigneeName: 'Marcus Chen',
    assignmentMode: 'Suggested',
    isActive: true,
    createdBy: 'Ruth Mojeed Ramirez',
    createdAt: '2025-01-15'
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  // 1. Sarah Thompson (Program Coordinator) - Overdue
  {
    id: 'tsk-101',
    title: 'Prepare participant onboarding list for Youth Leadership Initiative',
    description: 'Verify youth contact info, consent agreements, and dietary/transit subsidy requests.',
    owner: 'Sarah Thompson',
    assignedToId: 'u-3',
    assignedPostId: 'post-pc',
    assignedPostName: 'Program Coordinator',
    programId: 'prog-1',
    programName: 'Youth Leadership & Civic Equity Initiative',
    dueDate: '2026-09-21', // Overdue
    priority: 'High',
    status: 'To Do',
    source: 'PROGRAM',
    assignmentMethod: 'SUGGESTED',
    suggestedReason: 'Assigned post: Program Coordinator for Youth Leadership',
    aiAssisted: true,
    notes: '3 participants pending confirmation; phone outreach completed.',
    createdAt: '2026-09-12'
  },
  // 2. Sarah Thompson - Due Today #1
  {
    id: 'tsk-102',
    title: 'Follow up with workshop participants from Fall Kickoff',
    description: 'Distribute summary notes, slide deck, and 48-hour pulse check survey.',
    owner: 'Sarah Thompson',
    assignedToId: 'u-3',
    assignedPostId: 'post-pc',
    assignedPostName: 'Program Coordinator',
    eventId: 'evt-1',
    eventName: 'Community Accessibility & Plain Language Workshop',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    dueDate: '2026-09-23', // Due today
    priority: 'High',
    status: 'To Do',
    source: 'EVENT',
    assignmentMethod: 'SUGGESTED',
    suggestedReason: 'Rule triggered upon workshop completion',
    aiAssisted: true,
    notes: 'Draft follow-up template prepared by AI Assistant.',
    createdAt: '2026-09-16'
  },
  // 3. Sarah Thompson - Due Today #2
  {
    id: 'tsk-103',
    title: 'Confirm ASL interpreter & stage captioning for Youth Civic Policy Lab',
    description: 'Ensure captioning technician and two ASL interpreters are confirmed.',
    owner: 'Sarah Thompson',
    assignedToId: 'u-3',
    assignedPostId: 'post-pc',
    assignedPostName: 'Program Coordinator',
    eventId: 'evt-2',
    eventName: 'Youth Civic Policy & Deputation Lab',
    dueDate: '2026-09-23', // Due today
    priority: 'Medium',
    status: 'To Do',
    source: 'MANUAL',
    assignmentMethod: 'MANUAL',
    notes: 'Booking code: ASL-TOR-2026.',
    createdAt: '2026-09-15'
  },
  // 4. Sarah Thompson - Due Soon
  {
    id: 'tsk-104',
    title: 'Review attendance & honorarium eligibility from summer training module',
    description: 'Reconcile attendance logs with youth stipend eligibility threshold (min 80%).',
    owner: 'Sarah Thompson',
    assignedToId: 'u-3',
    assignedPostId: 'post-pc',
    assignedPostName: 'Program Coordinator',
    programId: 'prog-1',
    programName: 'Youth Leadership & Civic Equity Initiative',
    dueDate: '2026-09-26', // Due soon
    priority: 'Medium',
    status: 'In Progress',
    source: 'RULE',
    assignmentMethod: 'SUGGESTED',
    notes: '18 youth enrolled; 14 fully eligible for completion certificate.',
    createdAt: '2026-09-10'
  },
  // 5. Marcus Chen (Program Manager) - Due Soon
  {
    id: 'tsk-105',
    title: 'Submit Q3 interim progress report to Ontario Trillium Foundation',
    description: 'Compile diversity scorecards, participant demographics, and financial variance.',
    owner: 'Marcus Chen',
    assignedToId: 'u-2',
    assignedPostId: 'post-pm',
    assignedPostName: 'Program Manager',
    relatedRecordType: 'Funding',
    relatedRecordId: 'fnd-1',
    relatedRecordName: 'OTF Seed Grant 2026-27',
    dueDate: '2026-09-28',
    priority: 'High',
    status: 'In Progress',
    source: 'TEMPLATE',
    assignmentMethod: 'SUGGESTED',
    notes: 'Draft financial variance and participant demographic metrics attached.',
    createdAt: '2026-09-01'
  },
  // 6. Marcus Chen (Program Manager) - Overdue
  {
    id: 'tsk-106',
    title: 'Review coordinator monthly progress & milestone deliverables',
    description: 'One-on-one reviews with Program Coordinators on cohort engagement.',
    owner: 'Marcus Chen',
    assignedToId: 'u-2',
    assignedPostId: 'post-pm',
    assignedPostName: 'Program Manager',
    dueDate: '2026-09-20', // Overdue
    priority: 'High',
    status: 'To Do',
    source: 'RULE',
    assignmentMethod: 'SUGGESTED',
    notes: 'Monthly manager review cadence.',
    createdAt: '2026-09-08'
  },
  // 7. Marcus Chen (Program Manager) - Due Today
  {
    id: 'tsk-109',
    title: 'Approve curriculum adjustments for Civic Accessibility Lab Cohort B',
    description: 'Review Plain Language adaptation guidelines submitted by community advisors.',
    owner: 'Marcus Chen',
    assignedToId: 'u-2',
    assignedPostId: 'post-pm',
    assignedPostName: 'Program Manager',
    programId: 'prog-2',
    programName: 'Civic Accessibility & Digital Inclusion Lab',
    dueDate: '2026-09-23', // Due today
    priority: 'Medium',
    status: 'To Do',
    source: 'PROGRAM',
    assignmentMethod: 'MANUAL',
    notes: 'Approved in principle by advisory committee.',
    createdAt: '2026-09-19'
  },
  // 8. Jordan Patel (Volunteer) - Due Today
  {
    id: 'tsk-107',
    title: 'Confirm participant check-ins at Welcome Desk',
    description: 'Verify registrations on the check-in tablet and distribute name badges.',
    owner: 'Jordan Patel',
    assignedToId: 'u-4',
    assignedPostId: 'post-vol',
    assignedPostName: 'Volunteer',
    eventId: 'evt-1',
    eventName: 'Community Accessibility & Plain Language Workshop',
    dueDate: '2026-09-23', // Due today
    priority: 'Medium',
    status: 'To Do',
    source: 'TEMPLATE',
    assignmentMethod: 'SUGGESTED',
    notes: 'Tablet #2 assigned for welcome table.',
    createdAt: '2026-09-15'
  },
  // 9. Ruth Mojeed Ramirez (Executive Director) - Due Today
  {
    id: 'tsk-108',
    title: 'Review pending community applicant access requests & post assignments',
    description: 'Confirm roles, data scopes, and designated posts for pending applicants.',
    owner: 'Ruth Mojeed Ramirez',
    assignedToId: 'u-1',
    assignedPostId: 'post-ed',
    assignedPostName: 'Executive Director',
    dueDate: '2026-09-23', // Due today
    priority: 'High',
    status: 'To Do',
    source: 'SYSTEM',
    assignmentMethod: 'MANUAL',
    notes: '1 pending request awaiting approval.',
    createdAt: '2026-09-23'
  },
  // 10. Ruth Mojeed Ramirez (Executive Director) - Overdue
  {
    id: 'tsk-110',
    title: 'Sign off on Q3 Federal Heritage Multi-Year Contribution Agreement',
    description: 'Review compliance clauses and sign executive authorization for fiscal tranche 2.',
    owner: 'Ruth Mojeed Ramirez',
    assignedToId: 'u-1',
    assignedPostId: 'post-ed',
    assignedPostName: 'Executive Director',
    relatedRecordType: 'Funding',
    relatedRecordId: 'fnd-2',
    relatedRecordName: 'Federal Heritage Multi-Year Program Contribution',
    dueDate: '2026-09-22', // Overdue
    priority: 'High',
    status: 'To Do',
    source: 'RULE',
    assignmentMethod: 'SUGGESTED',
    notes: 'Funder awaiting digital signature via AdobeSign.',
    createdAt: '2026-09-14'
  }
];

export const INITIAL_TASK_ASSIGNMENTS: TaskAssignmentRecord[] = [
  {
    id: 'ta-1',
    taskId: 'tsk-101',
    userId: 'u-3',
    userName: 'Sarah Thompson',
    assignedBy: 'Ruth Mojeed Ramirez',
    assignedAt: '2026-09-12T10:00:00Z',
    isCurrent: true
  },
  {
    id: 'ta-2',
    taskId: 'tsk-102',
    userId: 'u-3',
    userName: 'Sarah Thompson',
    assignedBy: 'Marcus Chen',
    assignedAt: '2026-09-16T14:30:00Z',
    isCurrent: true
  }
];

export const INITIAL_TASK_ACTIVITY: TaskActivityRecord[] = [
  {
    id: 'tact-1',
    taskId: 'tsk-102',
    userId: 'u-2',
    userName: 'Marcus Chen',
    activityType: 'Assigned',
    metadata: { assignedTo: 'Sarah Thompson', post: 'Program Coordinator' },
    createdAt: '2026-09-16T14:30:00Z'
  },
  {
    id: 'tact-2',
    taskId: 'tsk-102',
    userId: 'u-3',
    userName: 'Sarah Thompson',
    activityType: 'AI Suggested',
    metadata: { note: 'Drafted follow-up outreach email with Gemini 2.5 Flash' },
    createdAt: '2026-09-17T09:15:00Z'
  }
];

export const INITIAL_FUNDING: FundingRecord[] = [
  {
    id: 'fnd-1',
    donorOrFunder: 'Ontario Trillium Foundation (OTF)',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    amountCad: 85000,
    date: '2026-01-15',
    fundingType: 'Grant',
    relatedProgramId: 'prog-2',
    relatedProgramName: 'Civic Accessibility & Digital Inclusion Lab',
    status: 'Received',
    grantDeliverableNote: 'Year 1 Tranche disbursed. Interim Q3 report due September 30, 2026.',
    reportDueDate: '2026-09-30',
    notes: 'Project #SED-2025-0914. Allocated towards audit tool licensing and community stipends.',
    createdAt: '2026-01-15'
  },
  {
    id: 'fnd-2',
    donorOrFunder: 'Department of Canadian Heritage (Anti-Racism Action Program)',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    amountCad: 110000,
    date: '2026-02-01',
    fundingType: 'Government',
    relatedProgramId: 'prog-1',
    relatedProgramName: 'Youth Leadership & Civic Equity Initiative',
    status: 'Received',
    grantDeliverableNote: 'Multi-year contribution agreement. Covers youth participant honoraria and research expenses.',
    reportDueDate: '2026-11-15',
    notes: 'Federal Grant Agreement ARAP-2026-882.',
    createdAt: '2026-02-01'
  },
  {
    id: 'fnd-3',
    donorOrFunder: 'Metcalf Foundation - Inclusive Economies',
    organizationId: 'org-1',
    organizationName: 'Metcalf Foundation',
    amountCad: 35000,
    date: '2026-06-10',
    fundingType: 'Foundation',
    relatedProgramId: 'prog-3',
    relatedProgramName: 'Systems-Level Racial Equity in Nonprofits Research',
    status: 'Received',
    grantDeliverableNote: 'Policy publication dissemination stipend and roundtable catering fund.',
    reportDueDate: '2027-01-31',
    notes: 'Confirmed funding for academic survey dissemination and open data dashboard.',
    createdAt: '2026-06-10'
  },
  {
    id: 'fnd-4',
    donorOrFunder: 'Community Individual Donor Circle',
    amountCad: 7500,
    date: '2026-08-15',
    fundingType: 'Individual Donation',
    status: 'Received',
    notes: 'Unrestricted annual community donations from 24 individual supporters.',
    createdAt: '2026-08-15'
  },
  {
    id: 'fnd-5',
    donorOrFunder: 'City of Toronto Community Grants Program',
    amountCad: 25000,
    date: '2026-09-10',
    fundingType: 'Government',
    relatedProgramId: 'prog-4',
    relatedProgramName: 'Inclusive Community Facilitator Accelerator',
    status: 'Pending Review',
    grantDeliverableNote: 'Application submitted for Fall intake. Decision notification anticipated in October.',
    reportDueDate: '2026-10-31',
    notes: 'Covers venue rentals and childcare subsidies for participants.',
    createdAt: '2026-09-10'
  }
];

export const INITIAL_INTERACTIONS: InteractionItem[] = [
  // --- CURRENT WEEK (Sep 12 - Sep 18): 16 touchpoints (Peak Engagement) ---
  {
    id: 'int-7',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Meeting',
    date: '2026-09-18',
    summary: 'Morning briefing on youth transit passes & workshop lab materials',
    details: 'Coordinated distribution of 25 TTC tokens and printed plain-language civic toolkits for tomorrow’s session.',
    authorName: 'Marcus Chen',
    followUpDate: '2026-09-21',
    createdAt: '2026-09-18'
  },
  {
    id: 'int-w0-1',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Call',
    date: '2026-09-18',
    summary: 'Confirmed delivery of 15 assistive listening headsets for community roundtable',
    details: 'Sound engineer will arrive 45 minutes prior to conduct live frequency testing and loop induction check.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-18'
  },
  {
    id: 'int-w0-2',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Workshop',
    date: '2026-09-18',
    summary: 'Hosted pilot onboarding breakout for 12 new youth cohort fellows',
    details: 'Facilitated experiential exercises on civic delegation strategy and youth-led committee representations.',
    authorName: 'Ruth Mojeed Ramirez',
    createdAt: '2026-09-18'
  },
  {
    id: 'int-1',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Email',
    date: '2026-09-17',
    summary: 'Discussed upcoming youth policy lab curriculum & food logistics',
    details: 'Sarah confirmed that 18 youth are confirmed for the Regent Park session. We agreed to provide vegetarian and halal dinner options and TTC day passes.',
    authorName: 'Marcus Chen',
    followUpDate: '2026-09-22',
    createdAt: '2026-09-17'
  },
  {
    id: 'int-8',
    personId: 'p-7',
    personName: 'Amélie Tremblay',
    organizationId: 'org-6',
    organizationName: 'Montreal Civic Inclusion Hub',
    type: 'Call',
    date: '2026-09-17',
    summary: 'Discussed Montreal bilingual accessibility consultation dates',
    details: 'Agreed on mid-November dates for the bilingual online community forum. Amélie will circulate recruitment flyers to community partners.',
    authorName: 'Maya Lin',
    followUpDate: '2026-09-24',
    createdAt: '2026-09-17'
  },
  {
    id: 'int-w0-3',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Meeting',
    date: '2026-09-17',
    summary: 'Discussed Q4 funding acceleration milestone and multi-year renewals',
    details: 'Presented preliminary equity audit outcomes; David confirmed eligibility for additional capacity-building grant extension.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-17'
  },
  {
    id: 'int-9',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Email',
    date: '2026-09-16',
    summary: 'Sent draft Q3 variance table & narrative overview',
    details: 'Provided early preview of participant retention rates and budget allocation for French-language transcription.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-16'
  },
  {
    id: 'int-w0-4',
    personId: 'p-8',
    personName: 'Kwame Mensah',
    type: 'Note',
    date: '2026-09-16',
    summary: 'Coordinated French-English live interpretation headsets test',
    details: 'Verified channel clarity on portable transmitter devices with volunteer leads.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-16'
  },
  {
    id: 'int-2',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Meeting',
    date: '2026-09-15',
    summary: 'Walkthrough of Spadina CSI workshop room for physical accessibility',
    details: 'Inspected elevator access, gender-neutral accessible washrooms, and clear acoustic projection. Kendra suggested leaving 2 front rows reserved for low-vision participants and caption screens.',
    authorName: 'Maya Lin',
    followUpDate: '2026-09-20',
    createdAt: '2026-09-15'
  },
  {
    id: 'int-w0-5',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Workshop',
    date: '2026-09-15',
    summary: 'Facilitated interactive community budgeting workshop in Scarborough',
    details: 'Gathered recommendations from 22 youth participants on municipal public infrastructure investment priorities.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-15'
  },
  {
    id: 'int-3',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School',
    type: 'Call',
    date: '2026-09-14',
    summary: 'Reviewed survey sampling methodology for Nonprofit Equity Index',
    details: 'Fatima approved the stratified sampling approach across mid-sized Canadian charities ($1M - $10M revenue). Recommended emphasizing anonymity safeguards in invitation letters.',
    authorName: 'Maya Lin',
    followUpDate: '2026-09-28',
    createdAt: '2026-09-14'
  },
  {
    id: 'int-w0-6',
    personId: 'p-7',
    personName: 'Amélie Tremblay',
    organizationId: 'org-6',
    organizationName: 'Montreal Civic Inclusion Hub',
    type: 'Email',
    date: '2026-09-14',
    summary: 'Reviewed speaker bios and community accessibility charter for bilingual session',
    details: 'Circulated French and English versions to 6 participating grassroots non-profits.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-14'
  },
  {
    id: 'int-10',
    personId: 'p-8',
    personName: 'Kwame Mensah',
    type: 'Note',
    date: '2026-09-13',
    summary: 'Volunteer facilitator orientation logistics & briefing completed',
    details: 'Confirmed volunteer role for hybrid chat moderation and ASL interpreter coordination at next week’s forum.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-13'
  },
  {
    id: 'int-w0-7',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School',
    type: 'Meeting',
    date: '2026-09-13',
    summary: 'Delivered mid-term research briefing on grassroots civic engagement metrics',
    details: 'Analyzed longitudinal participation metrics across non-profit leadership programs.',
    authorName: 'Ruth Mojeed Ramirez',
    createdAt: '2026-09-13'
  },
  {
    id: 'int-11',
    personId: 'p-5',
    personName: 'Elena Rostova',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    type: 'Email',
    date: '2026-09-12',
    summary: 'Acknowledged ARAP progress briefing note & interim invoice',
    details: 'Confirmed receipt of second quarter milestone report. Next quarterly review scheduled for late November.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-12'
  },
  {
    id: 'int-w0-8',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Call',
    date: '2026-09-12',
    summary: 'Followed up on youth transportation micro-stipends verification',
    details: 'Confirmed all 14 participants received travel subsidies ahead of the regional symposium.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-12'
  },

  // --- WEEK 1 (Sep 05 - Sep 11): 12 touchpoints ---
  {
    id: 'int-4',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Workshop',
    date: '2026-09-11',
    summary: 'Attended peer mentoring check-in for Youth Leadership Cohort',
    details: 'Tariq presented initial observations on youth transit barriers in Mississauga. Expressed enthusiasm to lead deputation exercise on September 29.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-11'
  },
  {
    id: 'int-w1-1',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School',
    type: 'Meeting',
    date: '2026-09-11',
    summary: 'Agreed on survey sample stratification for 45 community organizations',
    details: 'Structured cohorts into early-stage, mid-size, and mature community-led agencies.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-11'
  },
  {
    id: 'int-w1-2',
    personId: 'p-5',
    personName: 'Elena Rostova',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    type: 'Email',
    date: '2026-09-10',
    summary: 'Submitted interim financial drawdown report for Heritage Canada',
    details: 'Transmitted itemized ledger for bilingual transcription, participant honoraria, and captioning services.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-10'
  },
  {
    id: 'int-w1-3',
    personId: 'p-7',
    personName: 'Amélie Tremblay',
    organizationId: 'org-6',
    organizationName: 'Montreal Civic Inclusion Hub',
    type: 'Call',
    date: '2026-09-10',
    summary: 'Consultation on Montreal venue accessibility standards',
    details: 'Reviewed floor plans to ensure ramp incline compliance and tactile safety markers.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-10'
  },
  {
    id: 'int-12',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Call',
    date: '2026-09-09',
    summary: 'Pre-walkthrough room accessibility specifications check',
    details: 'Clarified microphone types and dietary accommodations for cohort participants.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-09'
  },
  {
    id: 'int-w1-4',
    personId: 'p-8',
    personName: 'Kwame Mensah',
    type: 'Note',
    date: '2026-09-09',
    summary: 'Reviewed volunteer safety protocol & emergency contact roster',
    details: 'Uploaded updated volunteer emergency contact sheets to secure cloud storage.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-09'
  },
  {
    id: 'int-5',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Meeting',
    date: '2026-09-08',
    summary: 'Check-in on Q3 grant deliverables and preliminary toolkit feedback',
    details: 'David was enthusiastic about our initial 30 nonprofit accessibility audits. Clarified budget line reallocations for plain-language translations.',
    authorName: 'Maya Lin',
    followUpDate: '2026-09-25',
    createdAt: '2026-09-08'
  },
  {
    id: 'int-w1-5',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Email',
    date: '2026-09-08',
    summary: 'Coordinated catering orders with local social enterprise bakery',
    details: 'Finalized dietary requirements for 35 participants at the upcoming community assembly.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-08'
  },
  {
    id: 'int-13',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    type: 'Workshop',
    date: '2026-09-07',
    summary: 'Facilitated internal equity curriculum review session',
    details: 'Reviewed 4 modules with community youth leaders.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-07'
  },
  {
    id: 'int-w1-6',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Meeting',
    date: '2026-09-07',
    summary: 'Physical inspection of barrier-free entrance and ramps',
    details: 'Verified width clearance and automatic door openers at central community center.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-07'
  },
  {
    id: 'int-w1-7',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Call',
    date: '2026-09-06',
    summary: 'Mentorship session on public speaking for municipal council deputations',
    details: 'Reviewed 5-minute timed remarks draft with youth cohort spokesperson.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-06'
  },
  {
    id: 'int-w1-8',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Workshop',
    date: '2026-09-05',
    summary: 'Funder roundtable presentation on grassroots non-profit sustainability',
    details: 'Showcased TIP impact metrics and participant empowerment case studies to regional donors.',
    authorName: 'Ruth Mojeed Ramirez',
    createdAt: '2026-09-05'
  },

  // --- WEEK 2 (Aug 29 - Sep 04): 9 touchpoints ---
  {
    id: 'int-w2-1',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Email',
    date: '2026-09-04',
    summary: 'Sent grant reporting timeline schedule and deliverable matrix',
    details: 'Confirmed milestones for youth policy briefs and accessibility audit syntheses.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-04'
  },
  {
    id: 'int-w2-2',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Meeting',
    date: '2026-09-03',
    summary: 'Quarterly strategy sync on youth empowerment program goals',
    details: 'Reviewed fellowship recruitment numbers and community partner engagement targets.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-03'
  },
  {
    id: 'int-w2-3',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Call',
    date: '2026-09-02',
    summary: 'Discussed braille signage production and tactile wayfinding',
    details: 'Approved sample mockups for event signage in high-traffic corridors.',
    authorName: 'Maya Lin',
    createdAt: '2026-09-02'
  },
  {
    id: 'int-w2-4',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Workshop',
    date: '2026-09-01',
    summary: 'Youth leadership skills lab on civic policy research',
    details: 'Instructed 16 youth participants on freedom-of-information research and open data portals.',
    authorName: 'Marcus Chen',
    createdAt: '2026-09-01'
  },
  {
    id: 'int-w2-5',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School',
    type: 'Email',
    date: '2026-08-31',
    summary: 'Finalized academic review timeline for nonprofit survey report',
    details: 'Established peer-review milestones ahead of November release.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-31'
  },
  {
    id: 'int-w2-6',
    personId: 'p-7',
    personName: 'Amélie Tremblay',
    organizationId: 'org-6',
    organizationName: 'Montreal Civic Inclusion Hub',
    type: 'Call',
    date: '2026-08-30',
    summary: 'Bilingual translation workflow and terminology glossary signoff',
    details: 'Standardized equity terminology across French and English outreach documentation.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-30'
  },
  {
    id: 'int-w2-7',
    personId: 'p-8',
    personName: 'Kwame Mensah',
    type: 'Note',
    date: '2026-08-30',
    summary: 'Updated community partner contact records in CRM',
    details: 'Cleaned up duplicate phone and email records across 18 volunteer profiles.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-30'
  },
  {
    id: 'int-6',
    personId: 'p-5',
    personName: 'Elena Rostova',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    type: 'Note',
    date: '2026-08-29',
    summary: 'Received official confirmation of Year 2 ARAP grant disbursement',
    details: 'Contribution agreement amendment signed by both parties. Electronic fund transfer completed.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-29'
  },
  {
    id: 'int-w2-8',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Meeting',
    date: '2026-08-29',
    summary: 'Introductory walkthrough of Spadina CSI center facilities',
    details: 'Mapped accessible entrance points and elevator proximity for upcoming cohorts.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-29'
  },

  // --- WEEK 3 (Aug 22 - Aug 28): 7 touchpoints ---
  {
    id: 'int-w3-1',
    personId: 'p-5',
    personName: 'Elena Rostova',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    type: 'Email',
    date: '2026-08-28',
    summary: 'Clarified eligible expense categories under Heritage contribution agreement',
    details: 'Heritage Canada officer confirmed eligibility for participant childcare subsidies.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-28'
  },
  {
    id: 'int-w3-2',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Meeting',
    date: '2026-08-27',
    summary: 'Curriculum draft review for Module 2: Community Organizing',
    details: 'Aligned on case study selection emphasizing historic Canadian equity milestones.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-27'
  },
  {
    id: 'int-14',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Call',
    date: '2026-08-26',
    summary: 'Bi-weekly grant monitoring check-in on youth fellowship stipends',
    details: 'Reviewed drawdown schedules and approved initial round of direct participant bursary transfers.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-26'
  },
  {
    id: 'int-w3-3',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School',
    type: 'Call',
    date: '2026-08-25',
    summary: 'Survey questionnaire testing with preliminary 5-respondent cohort',
    details: 'Calibrated completion time and clarity of civic inclusion scoring questions.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-25'
  },
  {
    id: 'int-w3-4',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Workshop',
    date: '2026-08-24',
    summary: 'Community storytelling and oral history facilitation workshop',
    details: 'Trained 10 community youth ambassadors in interviewing elders and documenting lived experiences.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-24'
  },
  {
    id: 'int-w3-5',
    personId: 'p-8',
    personName: 'Kwame Mensah',
    type: 'Note',
    date: '2026-08-23',
    summary: 'Volunteer orientation slide deck revision completed',
    details: 'Added plain-language summaries of organizational mission and accessibility commitments.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-23'
  },
  {
    id: 'int-w3-6',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Email',
    date: '2026-08-22',
    summary: 'Review of accessibility checklist for civic engagement forums',
    details: 'Incorporated sensory sensitivity considerations and quiet decompression zones.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-22'
  },

  // --- WEEK 4 (Aug 15 - Aug 21): 5 touchpoints ---
  {
    id: 'int-15',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Meeting',
    date: '2026-08-21',
    summary: 'Joint planning meeting for Fall 2026 civic policy curriculum',
    details: 'Aligned on 6 core experiential modules covering municipal deputations and participatory budgeting.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-21'
  },
  {
    id: 'int-w4-1',
    personId: 'p-3',
    personName: 'David O\'Connor',
    organizationId: 'org-1',
    organizationName: 'Ontario Trillium Foundation',
    type: 'Call',
    date: '2026-08-20',
    summary: 'Funder quarterly milestone alignment check-in',
    details: 'Confirmed scheduled submission date for Q2 financial and participant audit dossiers.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-20'
  },
  {
    id: 'int-w4-2',
    personId: 'p-5',
    personName: 'Elena Rostova',
    organizationId: 'org-2',
    organizationName: 'Department of Canadian Heritage',
    type: 'Email',
    date: '2026-08-19',
    summary: 'Acknowledged draft work plan and performance indicator metrics',
    details: 'Program officer shared positive remarks on regional youth engagement outreach.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-19'
  },
  {
    id: 'int-w4-3',
    personId: 'p-6',
    personName: 'Tariq Hassan',
    type: 'Workshop',
    date: '2026-08-17',
    summary: 'Youth orientation seminar on municipal governance structures',
    details: 'Introduced 14 participants to city council agenda formats and standing committee deputations.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-17'
  },
  {
    id: 'int-w4-4',
    personId: 'p-8',
    personName: 'Kwame Mensah',
    type: 'Note',
    date: '2026-08-16',
    summary: 'Initial intake of community volunteer applications',
    details: 'Logged 12 new volunteer submissions and scheduled telephone screening interviews.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-16'
  },

  // --- WEEK 5 (Aug 08 - Aug 14): 3 touchpoints ---
  {
    id: 'int-16',
    personId: 'p-2',
    personName: 'Dr. Fatima Al-Mansoor',
    organizationId: 'org-5',
    organizationName: 'U of T Munk School',
    type: 'Email',
    date: '2026-08-14',
    summary: 'Finalized academic advisory board scope for Nonprofit Equity Index',
    details: 'Approved the advisory terms of reference and data governance protocols.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-14'
  },
  {
    id: 'int-w5-1',
    personId: 'p-1',
    personName: 'Sarah Thompson',
    organizationId: 'org-4',
    organizationName: 'Black Canadian Youth Alliance',
    type: 'Meeting',
    date: '2026-08-11',
    summary: 'Kickoff brainstorm on civic leadership program curriculum',
    details: 'Explored curriculum partnership models and community youth mentor recruitment.',
    authorName: 'Marcus Chen',
    createdAt: '2026-08-11'
  },
  {
    id: 'int-17',
    personId: 'p-4',
    personName: 'Kendra Redsky',
    organizationId: 'org-3',
    organizationName: 'Toronto Accessibility Network',
    type: 'Workshop',
    date: '2026-08-08',
    summary: 'Summer accessibility co-design session with disabled youth leaders',
    details: 'Gathered feedback on hybrid sensory room design and plain-language civic briefs.',
    authorName: 'Maya Lin',
    createdAt: '2026-08-08'
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Civic Accessibility Audit Toolkit v2.1 (Working Draft)',
    type: 'Google Docs',
    url: 'https://docs.google.com/document/d/1tip-accessibility-toolkit-2026',
    relatedType: 'Program',
    relatedId: 'prog-2',
    relatedName: 'Civic Accessibility & Digital Inclusion Lab',
    addedBy: 'Maya Lin',
    addedAt: '2026-09-10',
    isConfidential: false,
    accessTier: 'all',
    description: 'Master guideline document used for testing community center and charity website accessibility.'
  },
  {
    id: 'doc-2',
    title: 'Youth Leadership Cohort — Participant Roster & Honoraria Ledger',
    type: 'Google Sheets',
    url: 'https://docs.google.com/spreadsheets/d/1tip-youth-roster-2026',
    relatedType: 'Program',
    relatedId: 'prog-1',
    relatedName: 'Youth Leadership & Civic Equity Initiative',
    addedBy: 'Marcus Chen',
    addedAt: '2026-09-02',
    isConfidential: true,
    accessTier: 'staff',
    description: 'Attendance records, workshop milestones, and verified direct-deposit payment references.'
  },
  {
    id: 'doc-3',
    title: 'TIP Nonprofit Governance & Inclusion Index — Research Methodology',
    type: 'Google Drive',
    url: 'https://drive.google.com/drive/folders/1tip-research-methodology-2026',
    relatedType: 'Program',
    relatedId: 'prog-3',
    relatedName: 'Systems-Level Racial Equity in Nonprofits Research',
    addedBy: 'Maya Lin',
    addedAt: '2026-08-18',
    isConfidential: false,
    accessTier: 'all',
    description: 'Ethics board review documents, survey instruments, and literature review folder.'
  },
  {
    id: 'doc-4',
    title: 'Ontario Trillium Foundation — Grant Agreement & Approved Budget',
    type: 'PDF / File',
    url: 'https://drive.google.com/file/d/1otf-agreement-signed-tip',
    relatedType: 'Funding',
    relatedId: 'fnd-1',
    relatedName: 'OTF Seed Grant 2026-27',
    addedBy: 'Maya Lin',
    addedAt: '2026-01-20',
    isConfidential: true,
    accessTier: 'management',
    description: 'Official countersigned contract #SED-2025-0914.'
  },
  {
    id: 'doc-5',
    title: 'Community Accessibility Workshop — Slide Deck & Handout Package',
    type: 'Google Slides',
    url: 'https://docs.google.com/presentation/d/1tip-accessibility-workshop-slides',
    relatedType: 'Event',
    relatedId: 'evt-1',
    relatedName: 'Community Accessibility & Plain Language Workshop',
    addedBy: 'Kendra Redsky',
    addedAt: '2026-09-14',
    isConfidential: false,
    accessTier: 'all',
    description: 'High-contrast large print presentation slides and accessible PDF participant handouts.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-1',
    action: 'Logged Interaction',
    entityType: 'Person',
    entityName: 'Sarah Thompson',
    userName: 'Marcus Chen',
    timestamp: '2026-09-17 14:22',
    details: 'Discussed upcoming youth policy lab curriculum & food logistics'
  },
  {
    id: 'aud-2',
    action: 'Task Created',
    entityType: 'Task',
    entityName: 'Follow up with Toronto community partner on workshop venue accessibility',
    userName: 'Maya Lin',
    timestamp: '2026-09-16 10:15',
    details: 'Assigned to Maya Lin, due Sep 19'
  },
  {
    id: 'aud-3',
    action: 'Logged Interaction',
    entityType: 'Person',
    entityName: 'Kendra Redsky',
    userName: 'Maya Lin',
    timestamp: '2026-09-15 16:40',
    details: 'Meeting regarding CSI Spadina physical accessibility walkthrough'
  },
  {
    id: 'aud-4',
    action: 'Task Completed',
    entityType: 'Task',
    entityName: 'Share draft research methodology with Dr. Fatima Al-Mansoor',
    userName: 'Maya Lin',
    timestamp: '2026-09-14 11:30',
    details: 'Completed on schedule'
  },
  {
    id: 'aud-5',
    action: 'Participant Registered',
    entityType: 'Event',
    entityName: 'Community Accessibility & Plain Language Workshop',
    userName: 'Marcus Chen',
    timestamp: '2026-09-12 09:10',
    details: 'Added Sarah Thompson to workshop attendee list'
  }
];

// ------------------------------------------------------------------------------
// TIP INTELLIGENCE — SEED DATA
// ------------------------------------------------------------------------------

export const INITIAL_AI_USER_SETTINGS: AiUserSettings = {
  aiEnabled: true,
  suggestionsEnabled: true,
  dailyBriefEnabled: true,
  workflowSuggestionsEnabled: true,
  taskSuggestionsEnabled: true
};

export const INITIAL_AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'sug-1',
    organizationId: 'org-tip',
    userId: 'u-3', // Sarah Thompson
    targetPostId: 'post-pc',
    targetPostName: 'Program Coordinator',
    category: 'For You',
    suggestionType: 'event_prep',
    title: 'Pre-Event Accessibility Checklist for Saturday Workshop',
    description: '4 days until Community Accessibility Workshop with 14 confirmed attendees.',
    observed: 'Event "Community Accessibility & Plain Language Workshop" is scheduled for 2026-09-26 (4 days away). 14 participants are registered. 0 pre-workshop accessibility questionnaires or dietary intake forms have been dispatched.',
    interpretation: 'Participants with mobility accommodations or dietary restrictions require at least 72 hours advance notice for catering and ASL interpreter coordination to be finalized.',
    suggestion: 'Generate and send the pre-event accommodation confirmation email to all 14 confirmed attendees today, and create a reminder task for Friday catering confirmation.',
    severity: 'Critical',
    supportingData: {
      daysUntilEvent: 4,
      attendeeCount: 14,
      accommodationsRecorded: 0
    },
    actionPreview: {
      id: 'act-prev-1',
      title: 'Dispatch Pre-Workshop Accommodations Check',
      description: 'Create follow-up tasks to verify ASL translation booking and email 14 attendees.',
      actionType: 'create_tasks',
      targetRecordType: 'Event',
      targetRecordId: 'evt-1',
      targetRecordName: 'Community Accessibility & Plain Language Workshop',
      payload: {
        tasks: [
          {
            title: 'Verify ASL interpreter contract and audio loop compatibility for Saturday workshop',
            assignedToId: 'u-3',
            assignedToName: 'Sarah Thompson',
            programId: 'prog-2',
            dueDate: '2026-09-24',
            priority: 'Urgent',
            status: 'Todo'
          },
          {
            title: 'Dispatch dietary & sensory accommodation reminder to 14 registered participants',
            assignedToId: 'u-3',
            assignedToName: 'Sarah Thompson',
            programId: 'prog-2',
            dueDate: '2026-09-24',
            priority: 'High',
            status: 'Todo'
          }
        ]
      },
      requiresConfirmation: true
    },
    status: 'new',
    createdAt: '2026-09-23T08:00:00Z'
  },
  {
    id: 'sug-2',
    organizationId: 'org-tip',
    userId: 'u-3', // Sarah Thompson
    targetPostId: 'post-pc',
    targetPostName: 'Program Coordinator',
    category: 'For You',
    suggestionType: 'task_overdue',
    title: '2 Priority Tasks Overdue in Civic Inclusion Program',
    description: 'Tasks "Finalize workshop accessibility audit checklist" and "Speaker confirmation" are past due.',
    observed: 'Task "Finalize workshop accessibility audit checklist" was due on 2026-09-19 (4 days overdue). Task "Speaker honoraria schedule" was due on 2026-09-21 (2 days overdue).',
    interpretation: 'Unfinished audit checklists will delay slide deck production scheduled for tomorrow morning.',
    suggestion: 'Reprioritize this morning to finalize the audit checklist draft or request assistance from Marcus Chen to review speaker paperwork.',
    severity: 'Important',
    supportingData: {
      overdueTasksCount: 2,
      oldestDueDateDays: 4
    },
    actionPreview: {
      id: 'act-prev-2',
      title: 'Update Due Dates & Flag Review',
      description: 'Re-align task deadlines to today and request manager review.',
      actionType: 'create_tasks',
      targetRecordType: 'Task',
      targetRecordId: 'task-2',
      targetRecordName: 'Finalize workshop accessibility audit checklist',
      payload: {
        tasks: [
          {
            title: 'Co-review workshop checklist draft with Marcus Chen',
            assignedToId: 'u-3',
            assignedToName: 'Sarah Thompson',
            programId: 'prog-2',
            dueDate: '2026-09-23',
            priority: 'High',
            status: 'Todo'
          }
        ]
      },
      requiresConfirmation: true
    },
    status: 'new',
    createdAt: '2026-09-23T08:15:00Z'
  },
  {
    id: 'sug-3',
    organizationId: 'org-tip',
    // Org / Manager level
    category: 'Organization',
    suggestionType: 'unassigned_task',
    title: '3 High-Priority Tasks Remain Unassigned in Youth Leadership',
    description: 'Critical cohort onboarding milestones currently lack an assigned team member.',
    observed: 'There are 3 open tasks created in the Youth Leadership Initiative without an assigned post or staff member. 1 of these tasks is scheduled to start within 48 hours.',
    interpretation: 'Without an assigned owner, milestone deliverables for participant stipend verification risk missing the bi-weekly accounting cutoff on Friday.',
    suggestion: 'Assign these 3 tasks to the Program Coordinator (Sarah Thompson) or Program Manager (Marcus Chen) according to post responsibilities.',
    severity: 'Critical',
    supportingData: {
      unassignedCount: 3,
      programName: 'Youth Leadership & Civic Equity Initiative',
      nextDeadline: '2026-09-25'
    },
    actionPreview: {
      id: 'act-prev-3',
      title: 'Assign Unassigned Tasks to Program Coordinator',
      description: 'Route the 3 unassigned cohort tasks to Sarah Thompson (post-pc).',
      actionType: 'assign_task',
      targetRecordType: 'Task',
      payload: {
        taskIds: ['task-unassigned-1', 'task-unassigned-2', 'task-unassigned-3'],
        assigneeId: 'u-3',
        assigneeName: 'Sarah Thompson'
      },
      requiresConfirmation: true
    },
    status: 'new',
    createdAt: '2026-09-23T07:45:00Z'
  },
  {
    id: 'sug-4',
    organizationId: 'org-tip',
    category: 'Workflow',
    suggestionType: 'automation_rule',
    title: 'Proposed Automation Rule: Auto-Create Accommodation Tasks',
    description: 'Avoid manual checklist creation whenever an attendee flags accessibility requirements.',
    observed: 'Over the last 30 days, 6 event registrants submitted accessibility accommodations. In each case, a staff member manually created 2-3 coordination tasks 2-4 days after registration.',
    interpretation: 'A standardized trigger rule will guarantee accommodations are processed immediately without depending on manual review.',
    suggestion: 'Create an automatic task assignment rule: "When a participant registers with accessibility requirements, automatically create an Accessibility Verification task assigned to Program Coordinator".',
    severity: 'Suggested',
    supportingData: {
      manualOccurrencesLastMonth: 6,
      averageLagDays: 3.2
    },
    actionPreview: {
      id: 'act-prev-4',
      title: 'Install Automated Assignment Rule',
      description: 'Create TaskAssignmentRule: "Event Registration -> Auto-create Accessibility Review".',
      actionType: 'create_rule',
      targetRecordType: 'Rule',
      payload: {
        name: 'Auto-create Accessibility Review on Registration',
        description: 'Generates coordinator task whenever a participant registers with specific accommodations.',
        triggerType: 'EventParticipantRegistered',
        assignedPostId: 'post-pc',
        assignedUserId: 'u-3',
        priority: 'High',
        daysUntilDue: 2,
        taskTitleTemplate: 'Review accommodations for {{participant_name}} ({{event_name}})',
        isActive: true
      },
      requiresConfirmation: true
    },
    status: 'new',
    createdAt: '2026-09-22T14:30:00Z'
  },
  {
    id: 'sug-5',
    organizationId: 'org-tip',
    category: 'Data',
    suggestionType: 'stale_relationship',
    title: '4 Partner Organizations Have No Recorded Touchpoints in > 45 Days',
    description: 'Black Canadian Youth Alliance and Toronto Accessibility Network have had no recent logs.',
    observed: '4 partner organizations marked as active institutional collaborators have had zero logged interactions, calls, or meetings recorded in the last 45 days.',
    interpretation: 'Quarterly partnership health reviews require at least 1 touchpoint every 30 days to sustain collaborative grant proposals.',
    suggestion: 'Schedule a 15-minute partner sync with Kendra Redsky (Toronto Accessibility Network) and David O\'Connor (Ontario Trillium Foundation).',
    severity: 'Suggested',
    supportingData: {
      staleOrgCount: 4,
      thresholdDays: 45,
      oldestContactDays: 62
    },
    actionPreview: {
      id: 'act-prev-5',
      title: 'Create Partner Touchpoint Tasks',
      description: 'Schedule partnership check-ins for the two longest-stale organizations.',
      actionType: 'create_tasks',
      targetRecordType: 'Organization',
      payload: {
        tasks: [
          {
            title: 'Schedule Q3 grant progress sync with David O\'Connor (OTF)',
            assignedToId: 'u-2',
            assignedToName: 'Marcus Chen',
            dueDate: '2026-09-26',
            priority: 'Medium',
            status: 'Todo'
          },
          {
            title: 'Quarterly partner alignment check-in with Toronto Accessibility Network',
            assignedToId: 'u-2',
            assignedToName: 'Marcus Chen',
            dueDate: '2026-09-28',
            priority: 'Medium',
            status: 'Todo'
          }
        ]
      },
      requiresConfirmation: true
    },
    status: 'new',
    createdAt: '2026-09-21T11:00:00Z'
  },
  {
    id: 'sug-6',
    organizationId: 'org-tip',
    category: 'Organization',
    suggestionType: 'workload_concentration',
    title: 'Workload Concentration: 72% of Active Tasks Assigned to 1 Coordinator',
    description: 'Sarah Thompson holds 8 of 11 open tasks across Civic Inclusion and Youth Leadership.',
    observed: 'Of 11 open tasks across all programs, 8 are assigned to Sarah Thompson (post-pc), 2 to Marcus Chen (post-pm), and 1 to Maya Lin. 3 tasks have identical due dates on 2026-09-25.',
    interpretation: 'Delivery bottleneck risk is elevated for the upcoming weekend workshop due to task bundling on a single coordinator.',
    suggestion: 'Rebalance logistics tasks: consider delegating participant check-in calls and catering coordination to available support team members.',
    severity: 'Important',
    supportingData: {
      totalOpenTasks: 11,
      sarahOpenTasks: 8,
      percentConcentration: 72
    },
    status: 'new',
    createdAt: '2026-09-23T08:05:00Z'
  }
];

export const INITIAL_BEHAVIOR_SNAPSHOTS: AiBehaviorSnapshot[] = [
  {
    id: 'snap-sarah-1',
    organizationId: 'org-tip',
    userId: 'u-3',
    userName: 'Sarah Thompson',
    postId: 'post-pc',
    postTitle: 'Program Coordinator',
    roleId: 'staff_member',
    period: 'Current (Sep 2026)',
    metrics: {
      openTaskCount: 8,
      overdueTaskCount: 2,
      completedTaskCount: 14,
      avgCompletionDays: 2.8,
      reassignmentCount: 1,
      upcomingEventCount: 2,
      pendingFollowupsCount: 3,
      attendanceRate: 88,
      unassignedTaskCount: 0,
      staleContactCount: 1,
      dataQualityIssuesCount: 0
    },
    createdAt: '2026-09-23T08:00:00Z'
  },
  {
    id: 'snap-org-1',
    organizationId: 'org-tip',
    userId: 'u-1',
    userName: 'Ruth Mojeed Ramirez',
    postId: 'post-ed',
    postTitle: 'Executive Director',
    roleId: 'super_admin',
    period: 'Current (Sep 2026)',
    metrics: {
      openTaskCount: 11,
      overdueTaskCount: 3,
      completedTaskCount: 32,
      avgCompletionDays: 3.4,
      reassignmentCount: 4,
      upcomingEventCount: 3,
      pendingFollowupsCount: 7,
      attendanceRate: 84,
      unassignedTaskCount: 3,
      staleContactCount: 4,
      dataQualityIssuesCount: 2
    },
    createdAt: '2026-09-23T08:00:00Z'
  }
];

export const INITIAL_AI_CONVERSATIONS: AiConversation[] = [
  {
    id: 'conv-1',
    organizationId: 'org-tip',
    userId: 'u-3',
    title: 'Preparing for Saturday Workshop',
    contextType: 'event',
    contextRecordId: 'evt-1',
    contextRecordName: 'Community Accessibility & Plain Language Workshop',
    createdAt: '2026-09-23T08:10:00Z',
    updatedAt: '2026-09-23T08:12:00Z'
  },
  {
    id: 'conv-2',
    organizationId: 'org-tip',
    userId: 'u-1',
    title: 'Organization Workload & Unassigned Milestones',
    contextType: 'dashboard',
    createdAt: '2026-09-23T07:50:00Z',
    updatedAt: '2026-09-23T07:55:00Z'
  }
];

export const INITIAL_AI_MESSAGES: AiMessage[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'What should I prioritize today for Saturday\'s workshop?',
    timestamp: '2026-09-23T08:10:00Z'
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: '**OBSERVED**\n• Event "Community Accessibility & Plain Language Workshop" is in 4 days (Sep 26).\n• 14 participants are registered.\n• 2 priority preparation tasks are currently pending, and 0 accessibility accommodation questionnaires have been dispatched.\n\n**INTERPRETATION**\nVenues and ASL interpreters typically require accommodation details 72 hours prior to ensure accessible seating and assistive listening devices are configured.\n\n**SUGGESTION**\nYour highest priority this morning is dispatching the attendee intake survey and confirming the ASL interpreter contract.',
    suggestedActions: [
      {
        label: 'Dispatch Accommodations Checklist',
        action: 'preview_action',
        payload: { actionPreviewId: 'act-prev-1' }
      },
      {
        label: 'View Registered Participants',
        action: 'navigate',
        payload: { view: 'events', eventId: 'evt-1' }
      }
    ],
    timestamp: '2026-09-23T08:10:30Z'
  }
];

