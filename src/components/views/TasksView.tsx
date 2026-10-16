import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Calendar, 
  User, 
  AlertCircle, 
  Check, 
  Filter,
  ArrowRight,
  Trash2,
  Lock,
  X,
  Sparkles,
  Zap,
  Briefcase,
  Copy,
  Loader2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem, TaskPriority, TaskStatus, TaskSource, TaskAssignmentMethod } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { requestTaskAssistance, TaskAssistanceResponse } from '../../lib/aiOrchestrator';

type TaskFilterTab = 'All' | 'Today' | 'Upcoming' | 'Suggested' | 'Completed';

interface TasksViewProps {
  onSelectPerson?: (personId: string) => void;
  onSelectProgram?: (programId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  onSelectPerson,
  onSelectProgram
}) => {
  const { 
    tasks, 
    scopedTasks,
    addTask, 
    updateTask, 
    toggleTaskStatus, 
    deleteTask,
    approveSuggestedTask,
    rejectSuggestedTask,
    posts,
    users,
    currentUser,
    hasPermission,
    isSuperAdmin,
    isStaffManager
  } = useCrm();

  const isManagerOrAdmin = isSuperAdmin || isStaffManager;
  const visibleTasks = isManagerOrAdmin ? tasks : scopedTasks;

  const [activeTab, setActiveTab] = useState<TaskFilterTab>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [postFilter, setPostFilter] = useState<string>('All');

  // Add task inline / modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newOwner, setNewOwner] = useState(currentUser.name);
  const [newAssignedToId, setNewAssignedToId] = useState(currentUser.id);
  const [newAssignedPostId, setNewAssignedPostId] = useState(currentUser.postId || '');
  const [newSource, setNewSource] = useState<TaskSource>('MANUAL');
  const [newAssignmentMethod, setNewAssignmentMethod] = useState<TaskAssignmentMethod>('MANUAL');
  const [newNotes, setNewNotes] = useState('');

  // AI Task Assistant modal
  const [selectedTaskForAi, setSelectedTaskForAi] = useState<TaskItem | null>(null);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiAssistResult, setAiAssistResult] = useState<TaskAssistanceResponse | null>(null);
  const [subtasksChecked, setSubtasksChecked] = useState<Record<number, boolean>>({});
  const [copiedDraft, setCopiedDraft] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const owners = Array.from(new Set(visibleTasks.map(t => t.owner).filter(Boolean)));
  const suggestedTasksCount = visibleTasks.filter(t => t.assignmentMethod === 'SUGGESTED' && t.status !== 'Completed').length;
  const completedTasksCount = visibleTasks.filter(t => t.status === 'Completed').length;
  const todayTasksCount = visibleTasks.filter(t => t.dueDate === today && t.status !== 'Completed').length;

  const filteredTasks = useMemo(() => {
    const list = visibleTasks.filter(task => {
      // Tab filter
      if (activeTab === 'Today') {
        if (task.dueDate !== today) return false;
      } else if (activeTab === 'Upcoming') {
        if (task.dueDate < today) return false;
      } else if (activeTab === 'Suggested') {
        if (task.assignmentMethod !== 'SUGGESTED' || task.status === 'Completed') return false;
      } else if (activeTab === 'Completed') {
        if (task.status !== 'Completed') return false;
      }

      // Owner filter
      if (ownerFilter !== 'All' && task.owner !== ownerFilter) return false;

      // Priority filter
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;

      // Post filter
      if (postFilter !== 'All' && task.assignedPostId !== postFilter) return false;

      return true;
    });

    // When viewing All, Today, or Upcoming, place active tasks first, followed by completed ones
    if (activeTab !== 'Completed') {
      return [...list].sort((a, b) => {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }

    return list;
  }, [visibleTasks, activeTab, today, ownerFilter, priorityFilter, postFilter]);

  const handlePostSelectionChange = (postId: string) => {
    setNewAssignedPostId(postId);
    // Find staff member with this post
    const matchedUser = users.find(u => u.postId === postId);
    if (matchedUser) {
      setNewAssignedToId(matchedUser.id);
      setNewOwner(matchedUser.name);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const post = posts.find(p => p.id === newAssignedPostId);

    addTask({
      title: newTitle.trim(),
      owner: newOwner,
      assignedToId: newAssignedToId || undefined,
      assignedPostId: newAssignedPostId || undefined,
      assignedPostName: post?.name,
      dueDate: newDueDate,
      priority: newPriority,
      status: 'To Do',
      source: newSource,
      assignmentMethod: newAssignmentMethod,
      notes: newNotes.trim() || undefined
    });

    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

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

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            Tasks & Operational Work Engine
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Post-driven assignments, automated rule triggers, and grounded AI assistance.
          </p>
        </div>

        <ProtectedAction resource="tasks" action="create" lockStyle="badge">
          <Button
            onClick={() => setShowAddModal(true)}
            id="btn-add-task"
            variant="crimson"
            className="shadow-sm active:scale-98 shrink-0 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>
        </ProtectedAction>
      </div>

      {/* Suggested Tasks Review Queue Banner for Managers / Admins */}
      {isManagerOrAdmin && suggestedTasksCount > 0 && activeTab !== 'Suggested' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-md bg-amber-500 text-white shadow-2xs">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-amber-950">
                {suggestedTasksCount} Automated Rule Task{suggestedTasksCount > 1 ? 's' : ''} Awaiting Review
              </p>
              <p className="text-[11px] text-amber-800">
                Rule engine proposed assignments based on designated employee posts.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('Suggested')}
            className="text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-semibold shrink-0"
          >
            Review Queue ({suggestedTasksCount})
          </Button>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', 'Today', 'Upcoming', 'Suggested', 'Completed'] as TaskFilterTab[]).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="tasksTabActive"
                    className="absolute inset-0 bg-[#ea0543] rounded-full shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
                {tab === 'Today' && todayTasksCount > 0 && (
                  <span className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white text-rose-600' : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    {todayTasksCount}
                  </span>
                )}
                {tab === 'Suggested' && suggestedTasksCount > 0 && (
                  <span className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white text-rose-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {suggestedTasksCount}
                  </span>
                )}
                {tab === 'Completed' && completedTasksCount > 0 && (
                  <span className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white text-rose-600' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {completedTasksCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {posts.length > 0 && (
            <select
              value={postFilter}
              onChange={e => setPostFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-input bg-card text-foreground"
            >
              <option value="All">All Posts</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-input bg-card text-foreground"
          >
            <option value="All">All Assignees</option>
            {owners.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-input bg-card text-foreground"
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <Check className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground mt-1">
              You are completely caught up in this view.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredTasks.map((task, idx) => {
              const isOverdue = task.dueDate < today && task.status !== 'Completed';
              const isDone = task.status === 'Completed';
              const isSuggested = task.assignmentMethod === 'SUGGESTED' && !isDone;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSuggested ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      className={`mt-0.5 sm:mt-0 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                        isDone 
                          ? 'bg-emerald-600 border-emerald-600 text-white scale-105 shadow-2xs' 
                          : 'border-input hover:border-emerald-600 bg-card hover:scale-105'
                      }`}
                      title={isDone ? 'Mark as Incomplete' : 'Mark as Done'}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3] transition-transform text-white" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-xs sm:text-sm font-semibold transition-all ${
                          isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}>
                          {task.title}
                        </p>

                        {/* Explicit Done Badge */}
                        {isDone && (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Done
                          </Badge>
                        )}

                        {/* Post Badge */}
                        {task.assignedPostName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            {task.assignedPostName}
                          </span>
                        )}

                        {/* Suggested Tag */}
                        {isSuggested && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900 text-[10px] font-semibold">
                            Rule Suggestion
                          </Badge>
                        )}

                        {/* Source Tag */}
                        {task.source && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono">
                            {task.source}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span className={`flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-destructive font-semibold' : ''
                        }`}>
                          <Clock className="w-3 h-3" />
                          {task.dueDate} {isOverdue ? '(Overdue)' : ''}
                        </span>

                        <span>•</span>
                        <span className="font-medium text-foreground">{task.owner}</span>

                        {isDone && task.completedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">Completed: {task.completedAt}</span>
                          </>
                        )}

                        {task.eventName && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-600">Event: {task.eventName}</span>
                          </>
                        )}

                        {task.programName && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-600">Cohort: {task.programName}</span>
                          </>
                        )}
                      </div>

                      {task.suggestedReason && (
                        <p className="text-[11px] text-amber-800 mt-1 italic">
                          ℹ️ {task.suggestedReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Approve Suggested Task (1-Click for Managers/Admins) */}
                    {isSuggested && isManagerOrAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveSuggestedTask(task.id)}
                        className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Confirm Assignee</span>
                      </Button>
                    )}

                    {/* AI Assist Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAiAssist(task)}
                      className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>AI Assist</span>
                    </Button>

                    <Badge 
                      variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'warning' : 'secondary'}
                      className="text-[10px] font-semibold"
                    >
                      {task.priority}
                    </Badge>

                    <ProtectedAction resource="tasks" action="delete" mode="disable" showLockIcon={false}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete task "${task.title}"?`)) {
                            deleteTask(task.id);
                          }
                        }}
                        id={`btn-delete-task-${task.id}`}
                        title="Delete Task"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </ProtectedAction>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Task Modal with Post-Hierarchy Support */}
      <AnimatePresence>
        {showAddModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.25 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="text-base font-serif font-bold text-foreground">Add Operational Task</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign work directly or map to designated employee posts
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowAddModal(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateTask} className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Task Title *</label>
                  <Input 
                    type="text"
                    required
                    placeholder="e.g. Prepare participant onboarding list for Youth Leadership Initiative"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Due Date</label>
                    <Input 
                      type="date"
                      required
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                    <select 
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as TaskPriority)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Post Designation and Assignee */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Designated Post</label>
                    <select
                      value={newAssignedPostId}
                      onChange={e => handlePostSelectionChange(e.target.value)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      <option value="">No Post (General Task)</option>
                      {posts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Assigned Person</label>
                    <select
                      value={newAssignedToId}
                      onChange={e => {
                        setNewAssignedToId(e.target.value);
                        const user = users.find(u => u.id === e.target.value);
                        if (user) setNewOwner(user.name);
                      }}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      {users.filter(u => u.status === 'approved').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.postTitle || u.title})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assignment Mode & Source */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Assignment Mode</label>
                    <select
                      value={newAssignmentMethod}
                      onChange={e => setNewAssignmentMethod(e.target.value as TaskAssignmentMethod)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      <option value="MANUAL">Direct Assignment</option>
                      <option value="SUGGESTED">Suggested for Review (Default)</option>
                      <option value="AUTOMATIC">Automatic Rule Assignment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Source Trigger</label>
                    <select
                      value={newSource}
                      onChange={e => setNewSource(e.target.value as TaskSource)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      <option value="MANUAL">Manual</option>
                      <option value="PROGRAM">Program Milestone</option>
                      <option value="EVENT">Event Follow-up</option>
                      <option value="RULE">Workflow Rule</option>
                      <option value="AI_SUGGESTION">AI Recommendation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Notes / Instructions</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide context, required deliverable attachments, or guidance..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-input bg-card text-foreground focus:ring-1 focus:ring-ring focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="crimson"
                    size="sm"
                    className="shadow-sm"
                  >
                    Save Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Task Assistant Modal */}
      <AnimatePresence>
        {selectedTaskForAi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight">AI Task Assistant</h3>
                    <p className="text-xs text-zinc-500">
                      Grounded plan for <span className="font-semibold text-zinc-700">{selectedTaskForAi.owner}</span> ({selectedTaskForAi.assignedPostName || 'Staff'})
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

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <h4 className="text-sm font-bold text-zinc-900">{selectedTaskForAi.title}</h4>
                {selectedTaskForAi.description && (
                  <p className="text-xs text-zinc-600 mt-1">{selectedTaskForAi.description}</p>
                )}
              </div>

              {aiAssistLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-zinc-600">Generating grounded action plan & drafts...</p>
                </div>
              ) : aiAssistResult ? (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 font-medium leading-relaxed">
                    {aiAssistResult.summary}
                  </div>

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
    </div>
  );
};
