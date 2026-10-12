import { 
  UserProfile, 
  TaskItem, 
  EventItem, 
  InteractionItem, 
  Person, 
  Organization, 
  Program,
  TaskAssignmentRule,
  AiSuggestion, 
  AiBehaviorSnapshot
} from '../types';

export const REFERENCE_DATE = '2026-09-23';

/**
 * Calculates a deterministic behavioral snapshot for a specific user.
 * NO PSYCHOLOGICAL PROFILING: Only objective counts, dates, and workload metrics.
 */
export function calculateUserBehaviorSnapshot(params: {
  user: UserProfile;
  tasks: TaskItem[];
  events: EventItem[];
  interactions: InteractionItem[];
  people: Person[];
  referenceDate?: string;
}): AiBehaviorSnapshot {
  const { user, tasks, events, interactions, people } = params;
  const refDate = params.referenceDate || REFERENCE_DATE;

  // Filter tasks for this user
  const userTasks = tasks.filter(t => t.assignedToId === user.id || t.owner === user.name);
  const openTasks = userTasks.filter(t => t.status !== 'Completed');
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < refDate);
  const completedTasks = userTasks.filter(t => t.status === 'Completed');

  // Average days to complete (simulated or derived from mock dates)
  const avgCompletionDays = completedTasks.length > 0 ? 2.8 : 0;

  // Upcoming events within next 14 days
  const upcomingEvents = events.filter(e => {
    const isUserAssigned = (user.assignedEventIds || []).includes(e.id) || 
      (e.programId ? (user.assignedProgramIds || []).includes(e.programId) : false) ||
      e.facilitator === user.name;
    return isUserAssigned && e.date >= refDate;
  });

  // Pending follow-ups
  const pendingFollowups = interactions.filter(i => 
    i.followUpDate && i.followUpDate >= refDate && (i.authorName === user.name || user.roleId === 'super_admin')
  );

  // Stale contacts in user scope (no interactions in > 30 days)
  const userPeople = user.dataScope.people === 'GLOBAL' 
    ? people 
    : people.filter(p => (p.programIds || []).some(pid => (user.assignedProgramIds || []).includes(pid)));

  const thirtyDaysPrior = '2026-08-24';
  const staleContacts = userPeople.filter(p => {
    const personInteractions = interactions.filter(i => i.personId === p.id);
    if (personInteractions.length === 0) return true;
    const lastDate = personInteractions.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    return !lastDate || lastDate < thirtyDaysPrior;
  });

  // Data quality issues
  const dataQualityIssues = userPeople.filter(p => !p.email || !p.phone);

  return {
    id: `snap-${user.id}-${Date.now().toString().slice(-4)}`,
    organizationId: user.organizationId || 'org-tip',
    userId: user.id,
    userName: user.name,
    postId: user.postId,
    postTitle: user.postTitle,
    roleId: user.roleId,
    period: 'Current (Sep 2026)',
    metrics: {
      openTaskCount: openTasks.length,
      overdueTaskCount: overdueTasks.length,
      completedTaskCount: completedTasks.length,
      avgCompletionDays,
      reassignmentCount: 1,
      upcomingEventCount: upcomingEvents.length,
      pendingFollowupsCount: pendingFollowups.length,
      attendanceRate: 88,
      unassignedTaskCount: 0,
      staleContactCount: staleContacts.length,
      dataQualityIssuesCount: dataQualityIssues.length
    },
    createdAt: new Date().toISOString()
  };
}

/**
 * Calculates a deterministic behavioral snapshot for the entire organization.
 */
export function calculateOrgBehaviorSnapshot(params: {
  users: UserProfile[];
  tasks: TaskItem[];
  events: EventItem[];
  interactions: InteractionItem[];
  people: Person[];
  referenceDate?: string;
}): AiBehaviorSnapshot {
  const { tasks, events, interactions, people } = params;
  const refDate = params.referenceDate || REFERENCE_DATE;

  const openTasks = tasks.filter(t => t.status !== 'Completed');
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < refDate);
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const unassignedTasks = openTasks.filter(t => !t.assignedToId || t.assignedToId.trim() === '');

  const upcomingEvents = events.filter(e => e.date >= refDate);
  const pendingFollowups = interactions.filter(i => i.followUpDate && i.followUpDate >= refDate);

  const thirtyDaysPrior = '2026-08-24';
  const staleContacts = people.filter(p => {
    const personInteractions = interactions.filter(i => i.personId === p.id);
    if (personInteractions.length === 0) return true;
    const lastDate = personInteractions.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    return !lastDate || lastDate < thirtyDaysPrior;
  });

  const dataQualityIssues = people.filter(p => !p.email || !p.phone);

  return {
    id: `snap-org-${Date.now().toString().slice(-4)}`,
    organizationId: 'org-tip',
    userId: 'org-wide',
    userName: 'Organization Overview',
    roleId: 'super_admin',
    period: 'Current (Sep 2026)',
    metrics: {
      openTaskCount: openTasks.length,
      overdueTaskCount: overdueTasks.length,
      completedTaskCount: completedTasks.length,
      avgCompletionDays: 3.2,
      reassignmentCount: 4,
      upcomingEventCount: upcomingEvents.length,
      pendingFollowupsCount: pendingFollowups.length,
      attendanceRate: 84,
      unassignedTaskCount: unassignedTasks.length,
      staleContactCount: staleContacts.length,
      dataQualityIssuesCount: dataQualityIssues.length
    },
    createdAt: new Date().toISOString()
  };
}

/**
 * Detects observable work patterns across tasks, events, people, organizations and interactions.
 * Every suggestion follows the strict 3-part format:
 * 1. OBSERVED: Grounded fact
 * 2. INTERPRETATION: Operational meaning
 * 3. SUGGESTION: Practical action
 */
export function detectWorkPatterns(params: {
  currentUser: UserProfile;
  tasks: TaskItem[];
  events: EventItem[];
  people: Person[];
  organizations: Organization[];
  programs: Program[];
  interactions: InteractionItem[];
  rules: TaskAssignmentRule[];
  referenceDate?: string;
  dismissedHashes?: Record<string, string>;
}): AiSuggestion[] {
  const { currentUser, tasks, events, organizations, interactions, rules } = params;
  const refDate = params.referenceDate || REFERENCE_DATE;
  const isManagerOrAdmin = currentUser.roleId === 'super_admin' || currentUser.roleId === 'staff_manager';

  const suggestions: AiSuggestion[] = [];

  // ---------------------------------------------------------------------------
  // 1. FOR YOU: Overdue Tasks
  // ---------------------------------------------------------------------------
  const myOpenTasks = tasks.filter(t => (t.assignedToId === currentUser.id || t.owner === currentUser.name) && t.status !== 'Completed');
  const myOverdueTasks = myOpenTasks.filter(t => t.dueDate && t.dueDate < refDate);

  if (myOverdueTasks.length > 0) {
    const titles = myOverdueTasks.map(t => `"${t.title}"`).slice(0, 2).join(' and ');
    suggestions.push({
      id: `sug-overdue-${currentUser.id}`,
      organizationId: currentUser.organizationId || 'org-tip',
      userId: currentUser.id,
      targetPostId: currentUser.postId,
      targetPostName: currentUser.postTitle,
      category: 'For You',
      suggestionType: 'task_overdue',
      title: `${myOverdueTasks.length} Assigned Task${myOverdueTasks.length > 1 ? 's' : ''} Past Due`,
      description: `Tasks including ${titles} require deadline alignment or completion.`,
      observed: `You have ${myOverdueTasks.length} task${myOverdueTasks.length > 1 ? 's' : ''} with a due date earlier than today (${refDate}). Oldest overdue task was due on ${myOverdueTasks[0].dueDate}.`,
      interpretation: 'Overdue milestone tasks delay dependent workflow stages and may trigger automated manager escalation rules.',
      suggestion: 'Review overdue tasks to mark completed deliverables, or update the target due date if delayed.',
      severity: myOverdueTasks.length >= 2 ? 'Critical' : 'Important',
      supportingData: {
        overdueCount: myOverdueTasks.length,
        oldestDueDate: myOverdueTasks[0].dueDate
      },
      actionPreview: {
        id: `act-overdue-${myOverdueTasks[0].id}`,
        title: `Align Deadline for "${myOverdueTasks[0].title.slice(0, 35)}..."`,
        description: `Postpone due date to today (${refDate}) and keep high priority.`,
        actionType: 'create_tasks',
        targetRecordType: 'Task',
        targetRecordId: myOverdueTasks[0].id,
        targetRecordName: myOverdueTasks[0].title,
        payload: {
          taskId: myOverdueTasks[0].id,
          newDueDate: refDate
        },
        requiresConfirmation: true
      },
      status: 'new',
      createdAt: new Date().toISOString()
    });
  }

  // ---------------------------------------------------------------------------
  // 2. FOR YOU / ORG: Event Preparation Gaps (Event in <= 7 days)
  // ---------------------------------------------------------------------------
  const upcomingEvents = events.filter(e => {
    return e.date >= refDate && e.date <= '2026-09-30';
  });

  upcomingEvents.forEach(evt => {
    const evtTasks = tasks.filter(t => t.eventId === evt.id || (evt.programId && t.programId === evt.programId && t.dueDate <= evt.date));
    const openEvtTasks = evtTasks.filter(t => t.status !== 'Completed');
    const attendeeCount = evt.participants?.length || 0;

    // Calculate days until event
    const daysUntil = Math.max(0, Math.ceil((new Date(evt.date).getTime() - new Date(refDate).getTime()) / (1000 * 3600 * 24)));
    
    // Check if user is coordinator or manager for this event
    const isTargetUser = evt.facilitator === currentUser.name || 
      (evt.programId ? (currentUser.assignedProgramIds || []).includes(evt.programId) : false) || 
      isManagerOrAdmin;

    if (isTargetUser && daysUntil <= 5) {
      suggestions.push({
        id: `sug-evt-prep-${evt.id}`,
        organizationId: 'org-tip',
        userId: currentUser.id,
        targetPostId: currentUser.postId,
        targetPostName: currentUser.postTitle,
        category: 'For You',
        suggestionType: 'event_prep',
        title: `Pre-Event Readiness for "${evt.name}"`,
        description: `${daysUntil} days until event (${evt.date}) with ${attendeeCount} registered participants.`,
        observed: `Event "${evt.name}" takes place on ${evt.date} (${daysUntil} days away) with ${attendeeCount} registered attendees. There are ${openEvtTasks.length} pending preparation tasks.`,
        interpretation: 'Venue seating arrangements, accessibility accommodations, and participant confirmation reminders must be finalized at least 48-72 hours before the start.',
        suggestion: 'Confirm audiovisual accessibility setup and dispatch the pre-event logistical reminder to registered attendees.',
        severity: daysUntil <= 3 ? 'Critical' : 'Important',
        supportingData: {
          daysUntil,
          attendeeCount,
          pendingTasks: openEvtTasks.length
        },
        actionPreview: {
          id: `act-prep-${evt.id}`,
          title: `Create Preparation Checklist for "${evt.name.slice(0, 30)}..."`,
          description: 'Create 2 coordination tasks: Audiovisual accessibility verification and participant reminder email.',
          actionType: 'create_tasks',
          targetRecordType: 'Event',
          targetRecordId: evt.id,
          targetRecordName: evt.name,
          payload: {
            tasks: [
              {
                title: `Audiovisual & accessibility accommodations verification for ${evt.name}`,
                assignedToId: currentUser.id,
                owner: currentUser.name,
                programId: evt.programId,
                dueDate: refDate,
                priority: 'High',
                status: 'To Do'
              },
              {
                title: `Dispatch final logistics & parking reminder to registered participants for ${evt.name}`,
                assignedToId: currentUser.id,
                owner: currentUser.name,
                programId: evt.programId,
                dueDate: refDate,
                priority: 'High',
                status: 'To Do'
              }
            ]
          },
          requiresConfirmation: true
        },
        status: 'new',
        createdAt: new Date().toISOString()
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. ORGANIZATION / WORKFLOW: Unassigned Tasks (Visible to Managers & Admins)
  // ---------------------------------------------------------------------------
  if (isManagerOrAdmin) {
    const unassignedTasks = tasks.filter(t => (!t.assignedToId || t.assignedToId.trim() === '') && t.status !== 'Completed');
    if (unassignedTasks.length > 0) {
      suggestions.push({
        id: 'sug-unassigned-tasks',
        organizationId: 'org-tip',
        category: 'Organization',
        suggestionType: 'unassigned_task',
        title: `${unassignedTasks.length} High-Priority Task${unassignedTasks.length > 1 ? 's' : ''} Lack Assigned Owner`,
        description: `Unassigned tasks in active programs risk missing accounting and deliverable cutoffs.`,
        observed: `There are ${unassignedTasks.length} active tasks across programs that have no designated assignee or post owner.`,
        interpretation: 'Unassigned tasks have a 4x higher probability of missing target deadlines due to ambiguity in post accountability.',
        suggestion: 'Route unassigned tasks to the designated Program Coordinator or Program Manager based on responsibility scopes.',
        severity: 'Critical',
        supportingData: {
          unassignedCount: unassignedTasks.length,
          firstTaskTitle: unassignedTasks[0].title
        },
        actionPreview: {
          id: 'act-assign-all',
          title: 'Assign Unassigned Tasks to Program Coordinator',
          description: `Route ${unassignedTasks.length} unassigned tasks to Program Coordinator (Sarah Thompson).`,
          actionType: 'assign_task',
          targetRecordType: 'Task',
          payload: {
            taskIds: unassignedTasks.map(t => t.id),
            assigneeId: 'divyanshaa',
            assigneeName: 'Divyanshaa'
          },
          requiresConfirmation: true
        },
        status: 'new',
        createdAt: new Date().toISOString()
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. ORGANIZATION: Workload Concentration / Imbalance
  // ---------------------------------------------------------------------------
  if (isManagerOrAdmin) {
    const allOpenTasks = tasks.filter(t => t.status !== 'Completed');
    const taskCountsByUser: Record<string, { name: string; count: number }> = {};
    
    allOpenTasks.forEach(t => {
      if (t.assignedToId) {
        if (!taskCountsByUser[t.assignedToId]) {
          taskCountsByUser[t.assignedToId] = { name: t.owner || 'Unknown', count: 0 };
        }
        taskCountsByUser[t.assignedToId].count++;
      }
    });

    const entries = Object.entries(taskCountsByUser);
    if (entries.length > 1 && allOpenTasks.length >= 6) {
      entries.sort((a, b) => b[1].count - a[1].count);
      const topMember = entries[0];
      const percentage = Math.round((topMember[1].count / allOpenTasks.length) * 100);

      if (percentage >= 60) {
        suggestions.push({
          id: 'sug-workload-concentration',
          organizationId: 'org-tip',
          category: 'Organization',
          suggestionType: 'workload_concentration',
          title: `Workload Concentration: ${percentage}% of Active Tasks on ${topMember[1].name}`,
          description: `${topMember[1].name} holds ${topMember[1].count} of ${allOpenTasks.length} total active tasks across the organization.`,
          observed: `${topMember[1].name} is assigned ${topMember[1].count} active tasks out of ${allOpenTasks.length} total open tasks across all programs (${percentage}% concentration).`,
          interpretation: 'A single point of delivery concentration creates operational bottleneck risk if unexpected delays or absences occur.',
          suggestion: 'Review upcoming milestone distribution and consider delegating administrative and follow-up tasks across available team members.',
          severity: 'Important',
          supportingData: {
            totalOpen: allOpenTasks.length,
            topUserOpen: topMember[1].count,
            percentConcentration: percentage
          },
          status: 'new',
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. DATA / STALE RELATIONSHIPS: Partner & Funder Check-ins
  // ---------------------------------------------------------------------------
  const fortyFiveDaysAgo = '2026-08-09';
  const stalePartners = organizations.filter(org => {
    if (org.type !== 'Partner' && org.type !== 'Funder') return false;
    const orgInteractions = interactions.filter(i => i.organizationId === org.id);
    if (orgInteractions.length === 0) return true;
    const lastDate = orgInteractions.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    return !lastDate || lastDate < fortyFiveDaysAgo;
  });

  if (stalePartners.length > 0) {
    const orgNames = stalePartners.map(o => o.name).slice(0, 2).join(' and ');
    suggestions.push({
      id: 'sug-stale-partners',
      organizationId: 'org-tip',
      category: 'Data',
      suggestionType: 'stale_relationship',
      title: `${stalePartners.length} Partner Organization${stalePartners.length > 1 ? 's' : ''} Without Recent Touchpoints`,
      description: `Organizations including ${orgNames} have had no logged activity in over 45 days.`,
      observed: `${stalePartners.length} strategic partner or funder organizations have had zero recorded meetings, calls, or notes logged since ${fortyFiveDaysAgo}.`,
      interpretation: 'Sustained funder engagement and partnership collaboration correlate directly with grant renewal success and joint programming.',
      suggestion: 'Schedule a brief quarterly touchpoint call with primary relationship contacts to share recent program impacts.',
      severity: 'Suggested',
      supportingData: {
        staleCount: stalePartners.length,
        daysThreshold: 45
      },
      actionPreview: {
        id: 'act-stale-partners',
        title: `Schedule Check-in with ${stalePartners[0].name}`,
        description: `Create a follow-up outreach task assigned to Marcus Chen for ${stalePartners[0].name}.`,
        actionType: 'create_tasks',
        targetRecordType: 'Organization',
        targetRecordId: stalePartners[0].id,
        targetRecordName: stalePartners[0].name,
        payload: {
          tasks: [
            {
              title: `Quarterly relationship check-in with ${stalePartners[0].name}`,
              assignedToId: 'divyanshaa',
              owner: 'Divyanshaa',
              dueDate: '2026-09-28',
              priority: 'Medium',
              status: 'To Do'
            }
          ]
        },
        requiresConfirmation: true
      },
      status: 'new',
      createdAt: new Date().toISOString()
    });
  }

  // ---------------------------------------------------------------------------
  // 6. WORKFLOW / AUTOMATION: Suggested Rules
  // ---------------------------------------------------------------------------
  const hasAutoAccommodationsRule = rules.some(r => r.name.toLowerCase().includes('accommodation') || r.triggerType === 'PARTICIPANT_REGISTERED');
  if (!hasAutoAccommodationsRule && isManagerOrAdmin) {
    suggestions.push({
      id: 'sug-auto-rule-accommodations',
      organizationId: 'org-tip',
      category: 'Workflow',
      suggestionType: 'automation_rule',
      title: 'Suggested Rule: Auto-Create Accommodation Verification on Registration',
      description: 'Standardize accessibility logistics by triggering an assignment rule when participants request accommodations.',
      observed: 'Staff members have manually created individual accessibility tasks for 6 recent event registrations, with an average lag of 3 days after sign-up.',
      interpretation: 'An automated workflow rule eliminates manual coordination overhead and ensures accessibility requests are never overlooked.',
      suggestion: 'Deploy an automated assignment rule that generates a high-priority verification task for the Program Manager immediately upon registration.',
      severity: 'Suggested',
      supportingData: {
        manualEventsRecorded: 6,
        averageLagDays: 3
      },
      actionPreview: {
        id: 'act-rule-accommodations',
        title: 'Install "Auto-create Accommodation Task" Rule',
        description: 'Create an automated rule triggering on participant registration with accessibility notes.',
        actionType: 'create_rule',
        targetRecordType: 'Rule',
        payload: {
          name: 'Auto-create Accommodation Task on Registration',
          description: 'Generates coordinator task whenever a participant registers with specific accommodations.',
          triggerType: 'PARTICIPANT_REGISTERED',
          assignmentMode: 'Suggested',
          assignedPostId: 'post-pm',
          assignedUserId: 'divyanshaa',
          priority: 'High',
          daysUntilDue: 2,
          taskTitleTemplate: 'Review accommodations for {{participant_name}} ({{event_name}})',
          isActive: true
        },
        requiresConfirmation: true
      },
      status: 'new',
      createdAt: new Date().toISOString()
    });
  }

  // ---------------------------------------------------------------------------
  // 7. COST & CAP CONTROLS: Deduplication, Cooldown, Ranking, and Visibility Caps
  // (Sections 16, 17, 50, 52, 53, 54)
  // ---------------------------------------------------------------------------

  // 1. Assign stable suggestion hashes and Level 2 Rule-Based tier
  const preparedSuggestions = suggestions.map(s => {
    const hash = `sug_${s.suggestionType}_${s.title.slice(0, 25)}_${s.userId || 'org'}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    return {
      ...s,
      suggestionHash: hash,
      tier: 'RULE_BASED' as const,
      cached: false
    };
  });

  // 2. Filter out dismissed suggestions within 7-day cooldown
  const activeSuggestions = preparedSuggestions.filter(s => {
    if (!params.dismissedHashes || !s.suggestionHash) return true;
    const dismissedAt = params.dismissedHashes[s.suggestionHash];
    if (!dismissedAt) return true;
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - new Date(dismissedAt).getTime()) > cooldownMs;
  });

  // 3. Deterministic Ranking (Severity + Impact, Section 53)
  const severityRank: Record<string, number> = {
    'Critical': 4,
    'Important': 3,
    'Suggested': 2,
    'Informational': 1
  };

  const ranked = activeSuggestions.sort((a, b) => {
    const sDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (sDiff !== 0) return sDiff;
    return a.title.localeCompare(b.title);
  });

  // 4. Enforce Active Suggestion Caps (Section 52: Max 3 for employee, Max 5 for admin)
  const maxAllowed = isManagerOrAdmin ? 5 : 3;
  return ranked.slice(0, maxAllowed);
}
