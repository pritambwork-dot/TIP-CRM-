import React, { useState, useMemo } from 'react';
import { 
  Sparkles,
  Calendar, 
  Users, 
  Clock, 
  ArrowRight, 
  CheckSquare, 
  AlertCircle, 
  Plus,
  ShieldCheck,
  Building2,
  PenLine,
  CheckCircle2,
  Briefcase,
  Layers,
  ChevronRight,
  UserCheck,
  Send,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../../context/CrmContext';
import { NavTab } from '../../types';
import { WeeklyActivityCard } from '../dashboard/WeeklyActivityCard';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { ROLE_DEFINITIONS } from '../../lib/permissions';
import { calculateMyWork } from '../../lib/myWorkEngine';
import { 
  requestTaskAssistance, 
  askNaturalLanguageDataQuery, 
  TaskAssistanceResponse 
} from '../../lib/aiOrchestrator';
import { TaskItem, TaskPriority } from '../../types';

interface DashboardViewProps {
  onNavigate: (tab: NavTab, recordId?: string) => void;
  onOpenQuickAction: () => void;
  onOpenQuickNote?: (personId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAction,
  onOpenQuickNote
}) => {
  const { 
    currentUser, 
    users,
    tasks,
    programs,
    events,
    participants,
    people,
    funding,
    posts,
    postResponsibilities,
    taskRules,
    toggleTaskStatus,
    approveSuggestedTask,
    rejectSuggestedTask,
    reassignTask,
    isSuperAdmin,
    isStaffManager,
    roleDefinition,
    switchActiveRole,
    setIsAiDrawerOpen
  } = useCrm();

  const [viewMode, setViewMode] = useState<'my_work' | 'team_overview'>('my_work');
  
  // AI Task Assistant modal state
  const [selectedTaskForAi, setSelectedTaskForAi] = useState<TaskItem | null>(null);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiAssistResult, setAiAssistResult] = useState<TaskAssistanceResponse | null>(null);
  const [subtasksChecked, setSubtasksChecked] = useState<Record<number, boolean>>({});
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Reassignment modal state
  const [reassigningTask, setReassigningTask] = useState<TaskItem | null>(null);
  const [reassignTargetUserId, setReassignTargetUserId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Natural Language Ask Assistant state
  const [showAskModal, setShowAskModal] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askResponse, setAskResponse] = useState<any | null>(null);

  // Calculate personalized "HOME = MY WORK" feed
  const myWork = useMemo(() => {
    return calculateMyWork({
      currentUser,
      allUsers: users,
      tasks,
      programs,
      events,
      participants,
      people,
      funding,
      posts,
      postResponsibilities,
      taskRules
    });
  }, [currentUser, users, tasks, programs, events, participants, people, funding, posts, postResponsibilities, taskRules]);

  // Handle opening AI Task Assistant
  const handleOpenAiAssist = async (task: TaskItem) => {
    setSelectedTaskForAi(task);
    setAiAssistLoading(true);
    setAiAssistResult(null);
    setSubtasksChecked({});
    setCopiedDraft(false);

    try {
      const res = await requestTaskAssistance(task, currentUser);
      setAiAssistResult(res);
    } catch (err) {
      console.error('Failed to get task assist', err);
    } finally {
      setAiAssistLoading(false);
    }
  };

  // Handle submitting Natural Language Query
  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    setAskLoading(true);
    try {
      const attendedCount = participants.filter(p => p.status === 'Attended').length;
      const computedAttendance = participants.length > 0 
        ? `${Math.round((attendedCount / participants.length) * 100)}%` 
        : '0%';
      const crmSummary = {
        programsCount: programs.length,
        eventsCount: events.length,
        peopleCount: people.length,
        tasksCount: tasks.length,
        avgAttendance: computedAttendance,
        totalFunding: funding.reduce((acc, f) => acc + (f.amountCad || 0), 0)
      };
      const res = await askNaturalLanguageDataQuery(askQuestion, currentUser, crmSummary);
      setAskResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAskLoading(false);
    }
  };

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleExecuteReassign = () => {
    if (reassigningTask && reassignTargetUserId) {
      reassignTask(reassigningTask.id, reassignTargetUserId, reassignReason || 'Manager workload rebalancing');
      setReassigningTask(null);
      setReassignTargetUserId('');
      setReassignReason('');
    }
  };

  const isManagerOrAdmin = isSuperAdmin || isStaffManager;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------------------ */}
      {/* 1. EMPLOYEE CONTEXT HEADER: Role vs Post Separation                     */}
      {/* ------------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-serif">
                {myWork.contextualAiNote.greeting}
              </h1>
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50/70 text-indigo-700 font-semibold px-2.5 py-0.5 text-xs">
                {myWork.post?.name || currentUser.postTitle || 'Designated Post'}
              </Badge>
              <Badge variant="outline" className="border-zinc-200 bg-zinc-100 text-zinc-800 font-medium px-2 py-0.5 text-xs flex items-center gap-1">
                <span>Active Role:</span>
                <strong className="font-semibold text-zinc-900">{roleDefinition.name}</strong>
              </Badge>

              {/* Multi-role quick switch selector if assignedRoleIds.length > 1 */}
              {currentUser.assignedRoleIds && currentUser.assignedRoleIds.length > 1 && (
                <div className="relative inline-flex items-center">
                  <select
                    value={currentUser.activeRoleId || currentUser.roleId}
                    onChange={(e) => switchActiveRole(e.target.value as any)}
                    className="text-xs bg-zinc-50 border border-zinc-300 rounded-lg px-2 py-0.5 font-semibold text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer shadow-2xs"
                    title="Switch active workspace role"
                  >
                    {currentUser.assignedRoleIds.map(rId => {
                      const def = ROLE_DEFINITIONS[rId] || ROLE_DEFINITIONS.staff_member;
                      return (
                        <option key={rId} value={rId}>
                          Role: {def.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
            
            <p className="text-xs sm:text-sm text-zinc-500 font-normal">
              {myWork.post?.description || 'Operational and community leadership at The Inclusion Project.'}
            </p>

            {/* Post Responsibilities Pills */}
            {myWork.responsibilities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mr-1">
                  Designated Responsibilities:
                </span>
                {myWork.responsibilities.map(r => (
                  <span 
                    key={r.id} 
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-600"
                    title={r.description}
                  >
                    • {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isManagerOrAdmin && (
              <div className="inline-flex p-1 bg-zinc-100 rounded-lg border border-zinc-200/80 mr-1">
                <button
                  type="button"
                  onClick={() => setViewMode('my_work')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'my_work' 
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  My Work ({myWork.counts.totalActive})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('team_overview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'team_overview' 
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Team Overview
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenQuickNote ? onOpenQuickNote() : onOpenQuickAction()}
              className="gap-1.5 text-xs"
            >
              <PenLine className="w-3.5 h-3.5 text-zinc-500" />
              <span>Quick Note</span>
            </Button>

            <Button
              variant="crimson"
              size="sm"
              onClick={onOpenQuickAction}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Action</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* 2. DAILY OPERATIONAL AI BRIEFING (Contextual AI Note)                   */}
      {/* ------------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-purple-50/40 to-white p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-600 text-white shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                {myWork.contextualAiNote.title}
              </h3>
              <span className="text-[10px] font-medium text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                Grounded Grounding (0% Hallucination)
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-normal">
              {myWork.contextualAiNote.summary}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-800">Key Focus:</span>
              <span className="bg-white/80 border border-zinc-200/60 px-2.5 py-1 rounded-md text-zinc-800 font-medium">
                {myWork.contextualAiNote.suggestedFocus}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiDrawerOpen(true)}
              className="bg-[#140a8e] hover:bg-[#0f076e] text-white border-[#140a8e] text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>TIP Intelligence</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAskModal(true)}
              className="border-indigo-200 hover:bg-indigo-100/50 text-indigo-800 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ask AI Analyst</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* WEEKLY ACTIVITY PULSE & ENGAGEMENT TRAJECTORY (Moved Upward)            */}
      {/* ------------------------------------------------------------------------ */}
      <section id="weekly-activity-section" aria-label="Weekly Activity and Engagement Pulse">
        <WeeklyActivityCard onNavigateToPeople={() => onNavigate('people')} />
      </section>

      {/* ------------------------------------------------------------------------ */}
      {/* VIEW SWITCH: "My Work" vs "Team Overview" (Managers/Admins)             */}
      {/* ------------------------------------------------------------------------ */}
      {viewMode === 'team_overview' && myWork.teamSummary ? (
        /* TEAM & OPERATIONAL HEALTH OVERVIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-zinc-200">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Open Tasks</span>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{myWork.teamSummary.totalOpenTasks}</div>
              <p className="text-xs text-zinc-500 mt-1">Across all team posts</p>
            </Card>

            <Card className="p-4 border-zinc-200">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Overdue Alerts</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">{myWork.teamSummary.totalOverdueTasks}</div>
              <p className="text-xs text-zinc-500 mt-1">Require coordinator triage</p>
            </Card>

            <Card className="p-4 border-zinc-200">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Completion Rate</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{myWork.teamSummary.completionRatePercent}%</div>
              <p className="text-xs text-zinc-500 mt-1">Weekly productivity score</p>
            </Card>

            <Card className="p-4 border-zinc-200">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested for Review</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{myWork.teamSummary.suggestedTasksPendingCount}</div>
              <p className="text-xs text-zinc-500 mt-1">Automated rule proposals</p>
            </Card>
          </div>

          {/* Workload by Staff Member & Post */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight mb-4">
              Team Workload & Post Assignment Distribution
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-500 uppercase font-semibold">
                    <th className="pb-3">Staff Member</th>
                    <th className="pb-3">Assigned Post</th>
                    <th className="pb-3 text-center">Active Tasks</th>
                    <th className="pb-3 text-center">Overdue</th>
                    <th className="pb-3 text-center">Completed</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {myWork.teamSummary.workloadByMember.map(member => (
                    <tr key={member.userId} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 font-semibold text-zinc-900">{member.userName}</td>
                      <td className="py-3 text-zinc-600">{member.postName}</td>
                      <td className="py-3 text-center font-bold text-zinc-800">{member.openCount}</td>
                      <td className="py-3 text-center">
                        {member.overdueCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            {member.overdueCount}
                          </span>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-emerald-600 font-semibold">{member.completedCount}</td>
                      <td className="py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onNavigate('tasks')}
                          className="text-xs text-zinc-600 hover:text-zinc-900"
                        >
                          View Tasks
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------------ */
        /* "HOME = MY WORK" 7-TIER PRIORITY WORK FEED                               */
        /* ------------------------------------------------------------------------ */
        <div className="space-y-6">
          {/* TIER 1: OVERDUE TASKS ALERT BANNER (If Any) */}
          {myWork.overdueTasks.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-rose-600 text-white shadow-2xs">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-rose-950 tracking-tight">
                    Action Required: Overdue Items ({myWork.overdueTasks.length})
                  </h3>
                </div>
                <span className="text-xs text-rose-700 font-semibold">Priority 1</span>
              </div>

              <div className="space-y-2.5">
                {myWork.overdueTasks.map(task => (
                  <div 
                    key={task.id}
                    className="p-3.5 rounded-xl bg-white border border-rose-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(task.id)}
                        className="mt-0.5 w-5 h-5 rounded border border-rose-400 text-rose-600 flex items-center justify-center hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        title="Mark Complete"
                      >
                        <Check className="w-3.5 h-3.5 opacity-0 hover:opacity-100" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-zinc-900">{task.title}</p>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Due {task.dueDate}
                          </Badge>
                          {task.assignedPostName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 text-zinc-700">
                              {task.assignedPostName}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-zinc-600 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAiAssist(task)}
                        className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>AI Assist</span>
                      </Button>

                      {isManagerOrAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReassigningTask(task)}
                          className="text-xs text-zinc-600 hover:text-zinc-900"
                        >
                          Reassign
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIER 2: TASKS DUE TODAY (FOCUS OF THE DAY) */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-600 text-white shadow-2xs">
                  <CheckSquare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Tasks Due Today ({myWork.todayTasks.length})
                  </h3>
                  <p className="text-xs text-zinc-500">Your primary operational focus for today</p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('tasks')}
                className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>All tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {myWork.todayTasks.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-zinc-700">All set for today!</p>
                  <p className="text-[11px] text-zinc-500">No overdue or pending tasks scheduled for today.</p>
                </div>
              ) : (
                myWork.todayTasks.map(task => (
                  <div 
                    key={task.id}
                    className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(task.id)}
                        className="mt-0.5 w-5 h-5 rounded border border-zinc-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Mark Complete"
                      >
                        <Check className="w-3.5 h-3.5 opacity-0 hover:opacity-100" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-zinc-900">{task.title}</p>
                          
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 ${
                              task.priority === 'High' 
                                ? 'border-rose-200 bg-rose-50 text-rose-700' 
                                : 'border-zinc-200 bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {task.priority} Priority
                          </Badge>

                          {task.eventName && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                              {task.eventName}
                            </span>
                          )}

                          {task.source && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono">
                              via {task.source}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-zinc-600 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAiAssist(task)}
                        className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>AI Assist</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TWO-COLUMN LAYOUT: TIER 3 (DUE SOON) & TIER 4 (UPCOMING EVENTS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TIER 3: TASKS DUE SOON (NEXT 7 DAYS) */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Due Soon ({myWork.upcomingTasks.length})
                  </h3>
                </div>
                <span className="text-xs text-zinc-500">Next 7 days</span>
              </div>

              <div className="space-y-2.5">
                {myWork.upcomingTasks.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">No tasks scheduled for the next 7 days.</p>
                ) : (
                  myWork.upcomingTasks.map(task => (
                    <div 
                      key={task.id}
                      className="p-3 rounded-xl border border-zinc-200/70 hover:border-zinc-300 hover:bg-zinc-50/50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{task.title}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Due {task.dueDate} • {task.programName || task.eventName || 'General Operations'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {task.priority}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TIER 4: UPCOMING EVENTS & SESSIONS */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Upcoming Sessions ({myWork.upcomingEvents.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('events')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span>All events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {myWork.upcomingEvents.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">No sessions scheduled in next 14 days.</p>
                ) : (
                  myWork.upcomingEvents.map(({ event, participantCount, daysUntil, isToday, isFacilitator }) => (
                    <div 
                      key={event.id}
                      onClick={() => onNavigate('events', event.id)}
                      className="p-3 rounded-xl border border-zinc-200/70 hover:border-zinc-300 hover:bg-zinc-50/50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-zinc-900 truncate">{event.name}</p>
                          {isToday && (
                            <Badge variant="crimson" className="text-[9px] px-1 py-0">Today</Badge>
                          )}
                          {isFacilitator && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-indigo-200 bg-indigo-50 text-indigo-700">
                              Facilitator
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {event.date} • {event.time} • {participantCount} participants registered
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* TWO-COLUMN LAYOUT: TIER 5 (RELATIONSHIPS & FOLLOW-UPS) & TIER 6 (RECENT ACTIVITY) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TIER 5: IMPORTANT RELATIONSHIPS & PENDING FOLLOW-UPS */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Relationship Follow-ups ({myWork.pendingFollowUps.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('people')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span>Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {myWork.pendingFollowUps.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">All partner relationships up to date.</p>
                ) : (
                  myWork.pendingFollowUps.map(fu => (
                    <div 
                      key={fu.id}
                      className="p-3 rounded-xl border border-zinc-200/70 hover:border-zinc-300 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-zinc-900 truncate">{fu.personName}</p>
                          {fu.organizationName && (
                            <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                              {fu.organizationName}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1">{fu.reason}</p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenQuickNote ? onOpenQuickNote(fu.personId) : onOpenQuickAction()}
                        className="text-xs shrink-0"
                      >
                        {fu.actionText}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TIER 6: RECENT OPERATIONAL ACTIVITY FEED */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    Recent Activity Trail
                  </h3>
                </div>
                <span className="text-xs text-zinc-500">Live operational log</span>
              </div>

              <div className="space-y-3">
                {myWork.recentActivity.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">No recent operational activity recorded.</p>
                ) : (
                  myWork.recentActivity.map(act => (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-zinc-900">{act.title}</p>
                          <span className="text-[10px] text-zinc-400 shrink-0">{act.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* AI TASK ASSISTANT MODAL (Step-by-step checklist, email draft, guidance) */}
      {/* ------------------------------------------------------------------------ */}
      <AnimatePresence>
        {selectedTaskForAi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight">AI Task Assistant</h3>
                    <p className="text-xs text-zinc-500">
                      Grounded operational guidance for <span className="font-semibold text-zinc-700">{currentUser.name}</span> ({currentUser.postTitle || 'Staff'})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTaskForAi(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Task Details Header */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-zinc-900">{selectedTaskForAi.title}</h4>
                  <Badge variant="outline" className="text-[10px]">
                    Due: {selectedTaskForAi.dueDate}
                  </Badge>
                </div>
                {selectedTaskForAi.description && (
                  <p className="text-xs text-zinc-600 mt-1">{selectedTaskForAi.description}</p>
                )}
              </div>

              {/* Loading State */}
              {aiAssistLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-zinc-600">Generating grounded action plan & drafts...</p>
                  <p className="text-[11px] text-zinc-400">Grounding against TIP operational guidelines</p>
                </div>
              ) : aiAssistResult ? (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 font-medium leading-relaxed">
                    {aiAssistResult.summary}
                  </div>

                  {/* Action Steps Checklist */}
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Concrete Subtasks ({aiAssistResult.actionSteps.length})</span>
                      <span className="text-[11px] font-normal text-zinc-500">
                        {Object.values(subtasksChecked).filter(Boolean).length} / {aiAssistResult.actionSteps.length} complete
                      </span>
                    </h5>

                    <div className="space-y-2">
                      {aiAssistResult.actionSteps.map((step, idx) => (
                        <label 
                          key={idx}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200/80 hover:bg-zinc-50/80 cursor-pointer transition-colors"
                        >
                          <input 
                            type="checkbox"
                            checked={!!subtasksChecked[idx]}
                            onChange={(e) => setSubtasksChecked(prev => ({ ...prev, [idx]: e.target.checked }))}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={`text-xs ${subtasksChecked[idx] ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                            {step}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Draft Note / Email */}
                  {aiAssistResult.draftNote && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                          Ready-to-Send Communication Draft
                        </h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyDraft(aiAssistResult.draftNote!)}
                          className="text-xs text-indigo-600 gap-1 h-7"
                        >
                          {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedDraft ? 'Copied!' : 'Copy Draft'}</span>
                        </Button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                        {aiAssistResult.draftNote}
                      </div>
                    </div>
                  )}

                  {/* Time Estimate & Delegation Advice */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                      <span className="text-zinc-500 font-medium">Estimated Time:</span>
                      <p className="font-bold text-zinc-900 mt-0.5">~{aiAssistResult.estimatedMinutes || 25} minutes</p>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                      <span className="text-zinc-500 font-medium">Delegation Advice:</span>
                      <p className="text-zinc-700 mt-0.5 line-clamp-2">{aiAssistResult.suggestedDelegation || 'Suitable for assigned post.'}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTaskForAi(null)}
                >
                  Close
                </Button>

                <Button
                  variant="crimson"
                  size="sm"
                  onClick={() => {
                    toggleTaskStatus(selectedTaskForAi.id);
                    setSelectedTaskForAi(null);
                  }}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Task Completed</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------------ */}
      {/* REASSIGN TASK MODAL                                                     */}
      {/* ------------------------------------------------------------------------ */}
      <AnimatePresence>
        {reassigningTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-zinc-900">Reassign Operational Task</h3>
              <p className="text-xs text-zinc-500">
                Reassign <span className="font-semibold text-zinc-800">"{reassigningTask.title}"</span> to another colleague.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">New Assignee</label>
                <select
                  value={reassignTargetUserId}
                  onChange={(e) => setReassignTargetUserId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-300 p-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select team member...</option>
                  {users.filter(u => u.status === 'approved').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.postTitle || u.title} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Reason for Reassignment</label>
                <input
                  type="text"
                  placeholder="e.g. Workload rebalancing, event lead"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-300 p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <Button variant="outline" size="sm" onClick={() => setReassigningTask(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="crimson" 
                  size="sm" 
                  disabled={!reassignTargetUserId}
                  onClick={handleExecuteReassign}
                >
                  Confirm Reassignment
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------------ */}
      {/* NATURAL LANGUAGE "ASK AI ANALYST" MODAL                                  */}
      {/* ------------------------------------------------------------------------ */}
      <AnimatePresence>
        {showAskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-xl w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">Ask Your Operational Data</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAskSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Ask any operational question within your authorized role scope:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. What is the attendance rate across our cohorts?"
                      value={askQuestion}
                      onChange={(e) => setAskQuestion(e.target.value)}
                      className="flex-1 text-xs rounded-xl border border-zinc-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button 
                      type="submit" 
                      variant="crimson" 
                      size="sm" 
                      disabled={askLoading || !askQuestion.trim()}
                      className="gap-1.5"
                    >
                      {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Ask</span>
                    </Button>
                  </div>
                </div>
              </form>

              {askResponse && (
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Interpreted Intent:</span>
                    <p className="font-bold text-zinc-800 mt-0.5">{askResponse.interpretedIntent}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
                    <span className="font-semibold text-indigo-700 uppercase tracking-wider text-[10px]">Deterministic Fact:</span>
                    <p className="font-mono text-zinc-900 mt-0.5 font-bold">{askResponse.calculationFact}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Nonprofit Analysis:</span>
                    <p className="text-zinc-700 mt-0.5 leading-relaxed">{askResponse.aiExplanation}</p>
                  </div>

                  {askResponse.suggestedAction && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-900">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Recommended Action:</span>
                      <p className="mt-0.5">{askResponse.suggestedAction}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
