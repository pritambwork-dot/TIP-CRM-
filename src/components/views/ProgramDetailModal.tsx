import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Users, 
  Compass, 
  CheckSquare, 
  FileText, 
  Plus, 
  Building2, 
  Check, 
  Edit3,
  ExternalLink,
  Target,
  Trash2,
  Lock,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Program, ProgramStatus } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { 
  Button, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Input, 
  Separator, 
  Avatar, 
  AvatarFallback 
} from '../ui';

interface ProgramDetailModalProps {
  programId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
  programId,
  isOpen,
  onClose,
  onSelectPerson,
  onSelectEvent
}) => {
  const { 
    programs, 
    updateProgram, 
    deleteProgram,
    projects,
    addProject,
    deleteProject,
    people, 
    events, 
    tasks, 
    documents, 
    organizations,
    currentUser,
    addTask,
    toggleTaskStatus,
    hasPermission
  } = useCrm();

  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'participants' | 'events' | 'tasks' | 'documents'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  const program = programs.find(p => p.id === programId);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ProgramStatus>('Active');
  const [editProgress, setEditProgress] = useState(0);

  // New project form state
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectOwner, setNewProjectOwner] = useState('');
  const [newProjectStartDate, setNewProjectStartDate] = useState('');
  const [newProjectEndDate, setNewProjectEndDate] = useState('');

  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  if (!isOpen || !program) return null;

  const handleStartEdit = () => {
    setEditName(program.name);
    setEditDesc(program.description);
    setEditStatus(program.status);
    setEditProgress(program.progressPercent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateProgram(program.id, {
      name: editName,
      description: editDesc,
      status: editStatus,
      progressPercent: editProgress
    });
    setIsEditing(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      owner: currentUser.name,
      dueDate: newTaskDueDate || '2026-09-30',
      priority: 'Medium',
      relatedRecordType: 'Program',
      relatedRecordId: program.id,
      relatedRecordName: program.name,
      status: 'To Do'
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setShowAddTask(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    addProject({
      programId: program.id,
      programName: program.name,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      status: 'Active',
      ownerName: newProjectOwner.trim() || currentUser.name,
      startDate: newProjectStartDate || new Date().toISOString().split('T')[0],
      endDate: newProjectEndDate || '2026-12-31',
      participantIds: []
    });

    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectOwner('');
    setNewProjectStartDate('');
    setNewProjectEndDate('');
    setShowAddProject(false);
  };

  const programProjects = projects.filter(prj => prj.programId === program.id);
  const programParticipants = people.filter(p => program.participantIds.includes(p.id) || p.programIds.includes(program.id));
  const programEvents = events.filter(e => e.programId === program.id);
  const programTasks = tasks.filter(t => t.relatedRecordId === program.id);
  const programDocs = documents.filter(d => d.relatedId === program.id);
  const programPartners = organizations.filter(org => program.partnerIds.includes(org.id));

  const tabsConfig = [
    { id: 'overview', label: 'Overview & Goals' },
    { id: 'projects', label: `Projects (${programProjects.length})` },
    { id: 'participants', label: `Participants (${programParticipants.length})` },
    { id: 'events', label: `Workshops & Events (${programEvents.length})` },
    { id: 'tasks', label: `Tasks & Milestones (${programTasks.length})` },
    { id: 'documents', label: `Cloud Documents (${programDocs.length})` },
  ] as const;

  return (
    <div 
      className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-200/90 bg-[#FAF9F8] flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant={
                  program.status === 'Active' ? 'crimson' :
                  program.status === 'Planning' ? 'indigo' : 'secondary'
                }
              >
                {program.status}
              </Badge>
              <span className="text-xs text-zinc-300">•</span>
              <span className="text-xs text-zinc-500 font-medium">Lead: {program.ownerName}</span>
            </div>

            {isEditing ? (
              <div className="space-y-2 mt-2">
                <Input 
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="text-lg font-bold text-zinc-900 w-full font-serif"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as ProgramStatus)}
                    className="text-xs h-9 border border-zinc-200 rounded-xl px-3 bg-white"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={editProgress}
                    onChange={e => setEditProgress(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs text-zinc-500 font-medium">%</span>
                </div>
              </div>
            ) : (
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-serif leading-snug">
                {program.name}
              </h3>
            )}

            <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Timeline: {program.startDate} to {program.endDate}</span>
              {program.budgetCad && (
                <>
                  <span className="text-zinc-300">•</span>
                  <span>Budget: ${program.budgetCad.toLocaleString('en-CA')} CAD</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditing ? (
              <Button 
                onClick={handleSaveEdit} 
                variant="outline"
                size="icon"
                title="Save changes"
                className="text-emerald-700 hover:bg-emerald-50"
              >
                <Check className="w-4 h-4" />
              </Button>
            ) : (
              <ProtectedAction resource="programs" action="edit" mode="disable" showLockIcon={false}>
                <Button 
                  onClick={handleStartEdit} 
                  id="btn-edit-program"
                  variant="outline"
                  size="icon"
                  title="Edit program details"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </ProtectedAction>
            )}

            <ProtectedAction resource="programs" action="delete" mode="disable" showLockIcon={false}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete the program "${program.name}"?`)) {
                    deleteProgram(program.id);
                    onClose();
                  }
                }}
                id="btn-delete-program"
                title="Super Admin: Delete Program"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </ProtectedAction>

            <Button 
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-800"
            >
              <X className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="px-6 py-3 bg-white border-b border-zinc-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 flex-1 max-w-sm mr-4">
            <span className="text-[11px] font-semibold text-zinc-600 shrink-0">Progress</span>
            <div className="w-full bg-[#f2f0f2] h-2 rounded-full overflow-hidden border border-zinc-200/60">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${program.progressPercent}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#ea0543] h-full rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-zinc-900 shrink-0">{program.progressPercent}%</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
            <span>{programProjects.length} projects</span>
            <span>•</span>
            <span>{programParticipants.length} participants</span>
            <span>•</span>
            <span>{programEvents.length} events</span>
          </div>
        </div>

        {/* Tab Headers with fluid animated pill */}
        <div className="flex items-center px-6 border-b border-zinc-200 bg-[#FDFDFD] text-xs font-semibold overflow-x-auto no-scrollbar gap-1 pt-1">
          {tabsConfig.map(tab => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-3 px-3 cursor-pointer transition-colors whitespace-nowrap select-none apple-tap ${
                  isTabActive ? 'text-[#140a8e]' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                {isTabActive && (
                  <motion.div
                    layoutId="programDetailActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#140a8e]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Program Description</h4>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed bg-[#f8f8f8] p-4 rounded-xl border border-zinc-200/90">
                  {program.description}
                </p>
              </div>

              {program.outcomes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#ea0543]" />
                    <span>Target Outcomes & Deliverables</span>
                  </h4>
                  <div className="p-3.5 rounded-xl border border-zinc-200/90 bg-white text-xs text-zinc-700 leading-relaxed shadow-2xs">
                    {program.outcomes}
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Focus Areas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {program.focusAreas.map((fa, i) => (
                    <Badge key={i} variant="secondary" className="font-medium text-xs normal-case py-1">
                      {fa}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Partner Organizations */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Collaborating Partners</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {programPartners.map(partner => (
                    <Card key={partner.id} className="p-3.5 flex items-center justify-between text-xs hover:border-[#140a8e]/35 transition-colors">
                      <div>
                        <p className="font-semibold text-zinc-900">{partner.name}</p>
                        <p className="text-[11px] text-zinc-500">{partner.sector}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] normal-case">{partner.type}</Badge>
                    </Card>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Projects */}
          {activeTab === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 font-serif">Program Projects</h4>
                  <p className="text-xs text-zinc-500">Structured projects and initiatives delivering this program</p>
                </div>
                <ProtectedAction resource="projects" action="create">
                  <Button
                    onClick={() => setShowAddProject(!showAddProject)}
                    id="btn-add-project"
                    variant="crimson"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </Button>
                </ProtectedAction>
              </div>

              {showAddProject && (
                <Card className="p-4 bg-zinc-50 border-zinc-200">
                  <form onSubmit={handleCreateProject} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Project Name *</label>
                      <Input 
                        type="text"
                        required
                        placeholder="e.g. Youth Civic Tech Fellowship 2026"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Description</label>
                      <Input 
                        type="text"
                        placeholder="Key milestones, objectives or cohort focus"
                        value={newProjectDesc}
                        onChange={e => setNewProjectDesc(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Project Lead</label>
                        <Input 
                          type="text"
                          placeholder={currentUser.name}
                          value={newProjectOwner}
                          onChange={e => setNewProjectOwner(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Start Date</label>
                        <Input 
                          type="date"
                          value={newProjectStartDate}
                          onChange={e => setNewProjectStartDate(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Target End Date</label>
                        <Input 
                          type="date"
                          value={newProjectEndDate}
                          onChange={e => setNewProjectEndDate(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddProject(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="crimson" size="sm">
                        Create Project
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {programProjects.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200">
                  <Briefcase className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-zinc-600">No projects created under this program yet.</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Add projects to break this program down into specific deliverables or cohort cycles.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {programProjects.map(prj => (
                    <Card key={prj.id} className="p-4 hover:border-zinc-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-semibold text-zinc-900">{prj.name}</h5>
                            <Badge 
                              variant={
                                prj.status === 'Active' ? 'crimson' :
                                prj.status === 'Planning' ? 'indigo' :
                                prj.status === 'Completed' ? 'secondary' : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {prj.status}
                            </Badge>
                          </div>
                          {prj.description && (
                            <p className="text-xs text-zinc-600 leading-relaxed">{prj.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                            <span>Lead: <strong className="text-zinc-600 font-medium">{prj.ownerName}</strong></span>
                            <span>•</span>
                            <span>Timeline: {prj.startDate} - {prj.endDate}</span>
                            {prj.participantIds && prj.participantIds.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{prj.participantIds.length} participants</span>
                              </>
                            )}
                          </div>
                        </div>

                        <ProtectedAction resource="projects" action="delete" mode="disable" showLockIcon={false}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete project "${prj.name}"?`)) {
                                deleteProject(prj.id);
                              }
                            }}
                            className="text-zinc-400 hover:text-rose-600 hover:bg-rose-50 -mt-1 -mr-1"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </ProtectedAction>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Participants */}
          {activeTab === 'participants' && (
            <motion.div 
              key="participants"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 font-serif">Program Participants & Roster</h4>
                <p className="text-xs text-zinc-500">People enrolled in or actively participating in this program</p>
              </div>

              {programParticipants.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">No participants associated with this program yet.</p>
              ) : (
                <div className="space-y-2">
                  {programParticipants.map(p => (
                    <Card
                      key={p.id}
                      onClick={() => onSelectPerson(p.id)}
                      className="p-3.5 flex items-center justify-between hover:border-[#140a8e]/35 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#f2f0f2] text-zinc-800 text-xs font-bold">
                            {p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-zinc-900">{p.name}</p>
                          <p className="text-[11px] text-zinc-500">{p.role || 'Participant'} • {p.email}</p>
                        </div>
                      </div>
                      <span className="text-[#140a8e] text-xs font-semibold hover:text-[#ea0543] flex items-center gap-1 transition-colors">
                        View person
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Events */}
          {activeTab === 'events' && (
            <motion.div 
              key="events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <h4 className="text-sm font-semibold text-zinc-900 font-serif">Program Workshops & Consultations</h4>
              {programEvents.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">No events scheduled under this program.</p>
              ) : (
                programEvents.map(evt => (
                  <Card
                    key={evt.id}
                    onClick={() => onSelectEvent(evt.id)}
                    className="p-3.5 flex items-center justify-between hover:border-[#140a8e]/35 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {evt.type}
                        </Badge>
                        <span className="text-xs font-semibold text-zinc-900">{evt.name}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{evt.date} • {evt.location}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#140a8e] hover:text-[#ea0543] flex items-center gap-1 transition-colors">
                      Attendance
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </Card>
                ))
              )}
            </motion.div>
          )}

          {/* TAB 4: Tasks */}
          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 font-serif">Program Deliverables</h4>
                  <p className="text-xs text-zinc-500">Tasks and action items for this initiative</p>
                </div>
                <ProtectedAction resource="tasks" action="create">
                  <Button
                    onClick={() => setShowAddTask(!showAddTask)}
                    id="btn-add-deliverable"
                    variant="crimson"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add deliverable</span>
                  </Button>
                </ProtectedAction>
              </div>

              {showAddTask && (
                <Card className="p-4 bg-zinc-50 border-zinc-200">
                  <form onSubmit={handleCreateTask} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Task Title</label>
                      <Input 
                        type="text"
                        required
                        placeholder="e.g. Finalize honoraria disbursements"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Due Date</label>
                      <Input 
                        type="date"
                        required
                        value={newTaskDueDate}
                        onChange={e => setNewTaskDueDate(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddTask(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="crimson" size="sm">
                        Save
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <div className="space-y-2">
                {programTasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center">No open tasks for this program.</p>
                ) : (
                  programTasks.map(t => (
                    <Card key={t.id} className="p-3 flex items-center justify-between hover:border-zinc-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTaskStatus(t.id)}
                          className="w-4.5 h-4.5 rounded-md border border-zinc-300 flex items-center justify-center cursor-pointer transition-colors hover:border-[#140a8e]"
                        >
                          {t.status === 'Completed' && <Check className="w-3 h-3 text-[#ea0543] stroke-[3]" />}
                        </button>
                        <div>
                          <p className={`text-xs font-semibold ${t.status === 'Completed' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{t.title}</p>
                          <p className="text-[11px] text-zinc-500">Due {t.dueDate} • {t.owner}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={t.priority === 'High' ? 'destructive' : 'secondary'}
                        className="text-[10px] normal-case"
                      >
                        {t.priority}
                      </Badge>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: Documents */}
          {activeTab === 'documents' && (
            <motion.div 
              key="documents"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <h4 className="text-sm font-semibold text-zinc-900 font-serif">Google Drive & Document Links</h4>
              {programDocs.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No documents linked to this program.</p>
              ) : (
                programDocs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 rounded-2xl border border-zinc-200/90 bg-white hover:border-[#140a8e]/40 hover:shadow-xs flex items-center justify-between text-xs group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:text-[#140a8e] group-hover:bg-[#140a8e]/10 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 group-hover:text-[#140a8e] transition-colors">{doc.title}</p>
                        <p className="text-[11px] text-zinc-400">{doc.type} • Added {doc.addedAt}</p>
                      </div>
                    </div>
                    <span className="text-[#140a8e] group-hover:text-[#ea0543] font-semibold flex items-center gap-1 transition-colors">
                      Open
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </a>
                ))
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
