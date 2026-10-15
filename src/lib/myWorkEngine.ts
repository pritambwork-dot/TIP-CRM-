import { 
  UserProfile, 
  TaskItem, 
  Program, 
  EventItem, 
  ParticipantRecord, 
  Person, 
  FundingRecord,
  Post, 
  PostResponsibility,
  TaskAssignmentRule
} from '../types';

export interface MyWorkFeed {
  user: UserProfile;
  post?: Post;
  responsibilities: PostResponsibility[];
  
  // 7-tier priorities
  overdueTasks: TaskItem[];
  todayTasks: TaskItem[];
  upcomingTasks: TaskItem[]; // Due within next 7 days
  laterTasks: TaskItem[];    // Due > 7 days
  completedRecentTasks: TaskItem[];
  
  upcomingEvents: Array<{
    event: EventItem;
    participantCount: number;
    daysUntil: number;
    isToday: boolean;
    isFacilitator: boolean;
  }>;

  pendingFollowUps: Array<{
    id: string;
    personId: string;
    personName: string;
    organizationName?: string;
    email: string;
    reason: string;
    urgency: 'high' | 'medium' | 'normal';
    actionText: string;
    lastContactDate?: string;
  }>;

  recentActivity: Array<{
    id: string;
    timestamp: string;
    title: string;
    description: string;
    icon: string;
    type: 'task' | 'event' | 'access' | 'rule';
  }>;

  contextualAiNote: {
    title: string;
    greeting: string;
    summary: string;
    actionItems: string[];
    suggestedFocus: string;
    groundedMetrics: Record<string, string | number>;
  };

  // Manager / Executive summary
  teamSummary?: {
    totalOpenTasks: number;
    totalOverdueTasks: number;
    completionRatePercent: number;
    suggestedTasksPendingCount: number;
    workloadByMember: Array<{
      userId: string;
      userName: string;
      postName: string;
      openCount: number;
      overdueCount: number;
      completedCount: number;
    }>;
  };

  counts: {
    overdue: number;
    today: number;
    upcoming: number;
    totalActive: number;
    eventsNext14Days: number;
    followUpsPending: number;
  };
}

export interface CalculateMyWorkParams {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  tasks: TaskItem[];
  programs: Program[];
  events: EventItem[];
  participants: ParticipantRecord[];
  people: Person[];
  funding?: FundingRecord[];
  posts: Post[];
  postResponsibilities: PostResponsibility[];
  taskRules?: TaskAssignmentRule[];
  referenceDate?: string; // Format 'YYYY-MM-DD', defaults to today
}

/**
 * Calculates the personalized "HOME = MY WORK" feed for the active employee.
 * Enforces Role (security/scope) vs Post (responsibilities/work assignments).
 */
export function calculateMyWork(params: CalculateMyWorkParams): MyWorkFeed {
  const {
    currentUser,
    allUsers,
    tasks,
    programs,
    events,
    participants,
    people,
    funding = [],
    posts,
    postResponsibilities,
    referenceDate
  } = params;

  // Use provided reference date or current date
  const today = referenceDate || new Date().toISOString().split('T')[0];
  const todayTime = new Date(today + 'T00:00:00').getTime();

  // Helper date arithmetic
  const getDaysDiff = (dateStr: string): number => {
    try {
      const targetTime = new Date(dateStr + 'T00:00:00').getTime();
      return Math.round((targetTime - todayTime) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // 1. Resolve User Post and Responsibilities
  const userPost = posts.find(p => p.id === currentUser.postId) || 
    posts.find(p => p.name.toLowerCase() === (currentUser.postTitle || '').toLowerCase());
  
  const userResponsibilities = postResponsibilities.filter(r => 
    userPost ? r.postId === userPost.id : false
  );

  // 2. Filter tasks assigned to this employee
  // A task belongs to the employee if:
  // - assignedToId matches user.id
  // - OR owner matches user.name
  // - OR assignedPostId matches user.postId (and not assigned to another specific user)
  const myTasks = tasks.filter(t => {
    if (t.assignedToId && t.assignedToId === currentUser.id) return true;
    if (t.owner && currentUser.name && t.owner.toLowerCase() === currentUser.name.toLowerCase()) return true;
    if (currentUser.roleId === 'volunteer' && t.owner?.toLowerCase().includes('volunteer')) return true;
    if (t.assignedPostId && currentUser.postId && t.assignedPostId === currentUser.postId && !t.assignedToId) return true;
    return false;
  });

  // 3. Segment Tasks by 7-tier timeline priority
  const overdueTasks: TaskItem[] = [];
  const todayTasks: TaskItem[] = [];
  const upcomingTasks: TaskItem[] = [];
  const laterTasks: TaskItem[] = [];
  const completedRecentTasks: TaskItem[] = [];

  for (const t of myTasks) {
    if (t.status === 'Completed') {
      completedRecentTasks.push(t);
      continue;
    }

    const diffDays = getDaysDiff(t.dueDate);
    if (diffDays < 0) {
      overdueTasks.push(t);
    } else if (diffDays === 0) {
      todayTasks.push(t);
    } else if (diffDays <= 7) {
      upcomingTasks.push(t);
    } else {
      laterTasks.push(t);
    }
  }

  // Sort tasks by priority (High -> Normal/Medium -> Low) and due date
  const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Normal: 2, Low: 1 };
  const sortTasks = (a: TaskItem, b: TaskItem) => {
    const pw = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
    if (pw !== 0) return pw;
    return a.dueDate.localeCompare(b.dueDate);
  };

  overdueTasks.sort(sortTasks);
  todayTasks.sort(sortTasks);
  upcomingTasks.sort(sortTasks);

  // 4. Upcoming Events relevant to scope
  const assignedProgIds = currentUser.assignedProgramIds || [];
  const assignedEvtIds = currentUser.assignedEventIds || [];
  const isManagerOrAdmin = currentUser.roleId === 'super_admin' || currentUser.roleId === 'staff_manager';

  const relevantEvents = events.filter(e => {
    if (isManagerOrAdmin) return true;
    if (assignedEvtIds.includes(e.id)) return true;
    if (e.programId && assignedProgIds.includes(e.programId)) return true;
    return false;
  });

  const upcomingEvents = relevantEvents
    .map(e => {
      const daysUntil = getDaysDiff(e.date);
      const participantCount = participants.filter(p => p.eventId === e.id).length;
      const isFacilitator = e.facilitator?.toLowerCase().includes(currentUser.name.toLowerCase()) || false;
      return {
        event: e,
        participantCount,
        daysUntil,
        isToday: daysUntil === 0,
        isFacilitator
      };
    })
    .filter(item => item.daysUntil >= 0 && item.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // 5. Important Relationships & Pending Follow-ups
  const pendingFollowUps: MyWorkFeed['pendingFollowUps'] = [];

  // Check recent workshop participants who attended but haven't received followup
  const recentAttended = participants.filter(p => p.status === 'Attended');
  recentAttended.slice(0, 3).forEach(pt => {
    pendingFollowUps.push({
      id: `fu-${pt.id}`,
      personId: pt.personId,
      personName: pt.personName,
      organizationName: pt.organizationName,
      email: pt.personEmail || '',
      reason: `Attended ${pt.eventName}. Follow-up survey & resource pack recommended.`,
      urgency: 'high',
      actionText: 'Send Follow-up Note',
      lastContactDate: pt.attendedAt
    });
  });

  // Check funding deliverables approaching (if user has funding access)
  if (currentUser.dataScope.funding !== 'NONE' && funding.length > 0) {
    funding.forEach(f => {
      const deadline = f.reportingDeadline || f.reportDueDate;
      if (deadline) {
        const daysToDeadline = getDaysDiff(deadline);
        if (daysToDeadline >= 0 && daysToDeadline <= 30) {
          pendingFollowUps.push({
            id: `fu-fund-${f.id}`,
            personId: f.organizationId || f.id,
            personName: f.donorOrFunder,
            organizationName: f.organizationName || f.donorOrFunder,
            email: 'grants@funder.org',
            reason: `Grant Deliverable / Interim Report due in ${daysToDeadline} days ($${f.amountCad.toLocaleString('en-CA')})`,
            urgency: daysToDeadline <= 7 ? 'high' : 'medium',
            actionText: 'Review Grant Milestones'
          });
        }
      }
    });
  }

  // 6. Recent Activity Feed (Clean state: populated dynamically from live events)
  const recentActivity: MyWorkFeed['recentActivity'] = [];

  // 7. Contextual AI Note / Briefing
  const openCount = overdueTasks.length + todayTasks.length + upcomingTasks.length;
  const greeting = getGreeting(currentUser.name);
  
  let summary = '';
  const actionItems: string[] = [];
  let suggestedFocus = '';

  if (overdueTasks.length > 0) {
    summary += `You have ${overdueTasks.length} overdue item${overdueTasks.length > 1 ? 's' : ''} requiring immediate attention. `;
    actionItems.push(`Resolve overdue: "${overdueTasks[0].title}"`);
  }
  if (todayTasks.length > 0) {
    summary += `${todayTasks.length} task${todayTasks.length > 1 ? 's are' : ' is'} scheduled for today. `;
    todayTasks.forEach(t => actionItems.push(t.title));
  } else {
    summary += `No specific tasks due today. `;
  }

  if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    const eventTimeStr = nextEvent.daysUntil === 0 ? 'today' : `in ${nextEvent.daysUntil} day${nextEvent.daysUntil > 1 ? 's' : ''}`;
    summary += `Upcoming event "${nextEvent.event.name}" is scheduled ${eventTimeStr} with ${nextEvent.participantCount} registered participants.`;
    suggestedFocus = `Prepare materials and confirm facilitators for ${nextEvent.event.name}.`;
  } else {
    suggestedFocus = overdueTasks.length > 0 
      ? `Clear overdue backlog item: ${overdueTasks[0].title}.`
      : `Advance milestones for assigned program cohorts.`;
  }

  const contextualAiNote = {
    title: `${userPost?.name || currentUser.title || 'Operational'} Daily Briefing`,
    greeting,
    summary,
    actionItems: actionItems.slice(0, 3),
    suggestedFocus,
    groundedMetrics: {
      overdueTasksCount: overdueTasks.length,
      todayTasksCount: todayTasks.length,
      upcomingTasksCount: upcomingTasks.length,
      activeEventsNext14Days: upcomingEvents.length,
      pendingFollowUpsCount: pendingFollowUps.length
    }
  };

  // 8. Manager / Executive Team Overview (if Staff Manager or Super Admin)
  let teamSummary: MyWorkFeed['teamSummary'] | undefined;
  if (isManagerOrAdmin) {
    const allOpen = tasks.filter(t => t.status !== 'Completed');
    const allOverdue = allOpen.filter(t => getDaysDiff(t.dueDate) < 0);
    const completedCount = tasks.filter(t => t.status === 'Completed').length;
    const totalCount = tasks.length || 1;
    const completionRatePercent = Math.round((completedCount / totalCount) * 100);

    const workloadByMember = allUsers
      .filter(u => u.status === 'approved' && u.isActive)
      .map(member => {
        const mTasks = tasks.filter(t => 
          (t.assignedToId && t.assignedToId === member.id) || 
          (t.owner && member.name && t.owner.toLowerCase() === member.name.toLowerCase())
        );
        const mOpen = mTasks.filter(t => t.status !== 'Completed');
        const mOverdue = mOpen.filter(t => getDaysDiff(t.dueDate) < 0);
        const mDone = mTasks.filter(t => t.status === 'Completed');
        const mPost = posts.find(p => p.id === member.postId);

        return {
          userId: member.id,
          userName: member.name,
          postName: mPost?.name || member.title || 'Staff',
          openCount: mOpen.length,
          overdueCount: mOverdue.length,
          completedCount: mDone.length
        };
      })
      .sort((a, b) => b.openCount - a.openCount);

    const suggestedTasksPendingCount = tasks.filter(t => 
      t.assignmentMethod === 'SUGGESTED' && t.status !== 'Completed'
    ).length;

    teamSummary = {
      totalOpenTasks: allOpen.length,
      totalOverdueTasks: allOverdue.length,
      completionRatePercent,
      suggestedTasksPendingCount,
      workloadByMember
    };
  }

  return {
    user: currentUser,
    post: userPost,
    responsibilities: userResponsibilities,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    laterTasks,
    completedRecentTasks,
    upcomingEvents,
    pendingFollowUps,
    recentActivity,
    contextualAiNote,
    teamSummary,
    counts: {
      overdue: overdueTasks.length,
      today: todayTasks.length,
      upcoming: upcomingTasks.length,
      totalActive: openCount,
      eventsNext14Days: upcomingEvents.length,
      followUpsPending: pendingFollowUps.length
    }
  };
}

function getGreeting(name: string): string {
  const firstName = name.split(' ')[0] || name;
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}
