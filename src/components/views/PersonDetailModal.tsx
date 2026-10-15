import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Plus, 
  CheckSquare, 
  FileText, 
  Trash2, 
  Edit3, 
  Check, 
  Compass,
  AlertCircle,
  Lock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Person, InteractionType, RelationshipType } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { sanitizeExternalUrl, sanitizeMailto } from '../../lib/safeUrls';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';

interface PersonDetailModalProps {
  personId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProgram?: (programId: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  personId,
  isOpen,
  onClose,
  onNavigateToProgram
}) => {
  const { 
    people, 
    updatePerson, 
    deletePerson, 
    interactions, 
    addInteraction, 
    tasks, 
    addTask, 
    toggleTaskStatus,
    documents,
    programs,
    events,
    currentUser,
    hasPermission,
    Permissions
  } = useCrm();

  const canEditPerson = hasPermission('people', 'edit');
  const canDeletePerson = hasPermission('people', 'delete');
  const canCreateInteraction = hasPermission('interactions', 'create');
  const canCreateTask = hasPermission('tasks', 'create');

  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'tasks' | 'documents'>('timeline');
  const [isEditing, setIsEditing] = useState(false);

  // New interaction form state
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [intType, setIntType] = useState<InteractionType>('Email');
  const [intSummary, setIntSummary] = useState('');
  const [intDetails, setIntDetails] = useState('');
  const [intFollowUp, setIntFollowUp] = useState('');

  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const person = people.find(p => p.id === personId);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editNextFollowUp, setEditNextFollowUp] = useState('');

  if (!isOpen || !person) return null;

  const handleStartEdit = () => {
    setEditName(person.name);
    setEditRole(person.role || '');
    setEditOrgName(person.organizationName || '');
    setEditEmail(person.email);
    setEditPhone(person.phone || '');
    setEditNotes(person.notes || '');
    setEditNextFollowUp(person.nextFollowUpDate || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updatePerson(person.id, {
      name: editName,
      role: editRole,
      organizationName: editOrgName,
      email: editEmail,
      phone: editPhone,
      notes: editNotes,
      nextFollowUpDate: editNextFollowUp || undefined
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove ${person.name} from the CRM?`)) {
      deletePerson(person.id);
      onClose();
    }
  };

  const handleCreateInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intSummary.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    addInteraction({
      personId: person.id,
      personName: person.name,
      organizationName: person.organizationName,
      type: intType,
      date: today,
      summary: intSummary.trim(),
      details: intDetails.trim(),
      authorName: currentUser.name,
      followUpDate: intFollowUp || undefined
    });

    setIntSummary('');
    setIntDetails('');
    setIntFollowUp('');
    setShowAddInteraction(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      title: taskTitle.trim(),
      owner: currentUser.name,
      dueDate: taskDueDate || '2026-09-25',
      priority: taskPriority,
      relatedRecordType: 'Person',
      relatedRecordId: person.id,
      relatedRecordName: person.name,
      status: 'To Do'
    });

    setTaskTitle('');
    setTaskDueDate('');
    setShowAddTask(false);
  };

  // Associated records
  const personInteractions = interactions.filter(i => i.personId === person.id);
  const personTasks = tasks.filter(t => t.relatedRecordType === 'Person' && t.relatedRecordId === person.id);
  const personDocs = documents.filter(d => d.relatedType === 'Person' && d.relatedId === person.id);
  const personPrograms = programs.filter(pr => person.programIds.includes(pr.id));
  const personEvents = events.filter(ev => person.eventIds.includes(ev.id));

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-stretch justify-end animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full max-w-2xl bg-card h-[92vh] sm:h-full rounded-t-3xl sm:rounded-none sm:rounded-l-2xl shadow-2xl flex flex-col overflow-hidden border-l border-border"
          onClick={e => e.stopPropagation()}
        >
          {/* iOS Drag Handle Bar (Mobile only) */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-muted/30">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Drawer Header */}
          <div className="p-4 sm:p-6 border-b border-border bg-muted/20 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="w-14 h-14 border border-border shadow-xs shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {person.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input 
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="text-base font-bold text-foreground h-9"
                      placeholder="Full Name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        type="text"
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="text-xs h-8"
                        placeholder="Role"
                      />
                      <Input 
                        type="text"
                        value={editOrgName}
                        onChange={e => setEditOrgName(e.target.value)}
                        className="text-xs h-8"
                        placeholder="Organization"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight">{person.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {person.role || 'Community Contact'} {person.organizationName ? `• ${person.organizationName}` : ''}
                    </p>
                  </>
                )}

                {/* Relationship badges */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {person.relationshipTypes.map((rt, idx) => (
                    <Badge 
                      key={idx}
                      variant="secondary"
                      className="text-[11px] font-semibold"
                    >
                      {rt}
                    </Badge>
                  ))}
                  {person.mailchimpStatus === 'subscribed' && (
                    <Badge variant="success" className="text-[10px] font-medium">
                      Mailchimp Synced
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isEditing ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveEdit}
                  id="btn-save-edit-person"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Save changes"
                >
                  <Check className="w-4 h-4" />
                </Button>
              ) : (
                <ProtectedAction resource="people" action="edit" mode="disable" showLockIcon={false}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleStartEdit}
                    id="btn-edit-person"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Edit Contact"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </ProtectedAction>
              )}

              <ProtectedAction resource="people" action="delete" mode="disable" showLockIcon={false}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDelete}
                  id="btn-delete-person"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </ProtectedAction>

              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                id="btn-close-person-modal"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Relationship Touchpoints Bar */}
          <div className="px-6 py-3 bg-card border-b border-border grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
              <span className="truncate">
                Last interaction: <strong className="text-foreground font-semibold">{person.lastInteractionDate || 'None logged'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                Next follow-up: <strong className="text-foreground font-semibold">{person.nextFollowUpDate || 'No date set'}</strong>
              </span>
            </div>
          </div>

          {/* Workspace Tabs */}
          <div className="flex items-center px-6 border-b border-border bg-muted/10 text-xs font-semibold overflow-x-auto scrollbar-none">
            {[
              { id: 'timeline', label: `Interaction Timeline (${personInteractions.length})` },
              { id: 'details', label: 'Profile & Interests' },
              { id: 'tasks', label: `Follow-up Tasks (${personTasks.length})` },
              { id: 'documents', label: `Documents (${personDocs.length})` }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative py-3.5 px-3.5 cursor-pointer transition-colors whitespace-nowrap ${
                    isActive ? 'text-[#ea0543] font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="relative z-10">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="personDetailActiveTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ea0543]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Interaction Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Communication & Activity</h4>
                  <p className="text-xs text-muted-foreground">Chronological history of emails, meetings, and calls</p>
                </div>
                {canCreateInteraction ? (
                  <Button
                    onClick={() => setShowAddInteraction(!showAddInteraction)}
                    id="btn-log-interaction"
                    variant="crimson"
                    size="sm"
                    className="h-8 text-xs font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Log interaction</span>
                  </Button>
                ) : (
                  <Button
                    disabled
                    id="btn-log-interaction-disabled"
                    title={Permissions.getDisabledReason('interactions', 'create')}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold cursor-not-allowed select-none opacity-60"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    <span>Log interaction</span>
                  </Button>
                )}
              </div>

              {/* Add Interaction Inline Form */}
              {showAddInteraction && (
                <Card className="p-4 bg-muted/30 border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">New Interaction Record</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowAddInteraction(false)} 
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Interaction Type</label>
                      <select 
                        value={intType}
                        onChange={e => setIntType(e.target.value as InteractionType)}
                        className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                      >
                        <option value="Email">Email</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Call">Call</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Note">Note</option>
                        <option value="Follow-up">Follow-up</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Next Follow-up Date (Optional)</label>
                      <Input 
                        type="date"
                        value={intFollowUp}
                        onChange={e => setIntFollowUp(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Summary</label>
                    <Input 
                      type="text"
                      required
                      placeholder="e.g. Discussed upcoming youth program schedule"
                      value={intSummary}
                      onChange={e => setIntSummary(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Detailed Notes</label>
                    <textarea 
                      rows={2}
                      placeholder="Key takeaways, agreements, or next action items..."
                      value={intDetails}
                      onChange={e => setIntDetails(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-input bg-card text-foreground focus:ring-1 focus:ring-ring focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddInteraction(false)}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      variant="crimson"
                      size="sm"
                      onClick={handleCreateInteraction}
                      className="text-xs h-8"
                    >
                      Save to Timeline
                    </Button>
                  </div>
                </Card>
              )}

              {/* Timeline Items */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {personInteractions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">No communications logged yet. Click "Log interaction" above.</p>
                ) : (
                  personInteractions.map(int => (
                    <div key={int.id} className="relative group">
                      <span className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                      <Card className="p-3.5 border-border/80 bg-card hover:border-primary/40 transition-colors shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-semibold text-foreground text-[10px]">
                              {int.type}
                            </Badge>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{int.date}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">By {int.authorName}</span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-semibold text-foreground mt-1">{int.summary}</h5>
                        {int.details && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{int.details}</p>
                        )}
                        {int.followUpDate && (
                          <div className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded inline-block">
                            Follow-up planned: {int.followUpDate}
                          </div>
                        )}
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Details & Interests */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <Card className="p-4 bg-muted/20 border-border/80 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="w-4 h-4 text-muted-foreground/70" />
                    {sanitizeMailto(person.email) ? (
                      <a href={sanitizeMailto(person.email)!} className="hover:underline text-foreground font-medium">
                        {person.email}
                      </a>
                    ) : (
                      <span className="text-foreground font-medium">{person.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="w-4 h-4 text-muted-foreground/70" />
                    <span className="text-foreground">{person.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Building2 className="w-4 h-4 text-muted-foreground/70" />
                    <span className="text-foreground">{person.organizationName || 'Independent'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <span className="text-muted-foreground font-bold">📍</span>
                    <span className="text-foreground">{person.city ? `${person.city}, ${person.province || 'Canada'}` : 'Canada'}</span>
                  </div>
                </div>
              </Card>

              {/* Interests & Focus Areas */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Interests & Expertise</h4>
                <div className="flex flex-wrap gap-1.5">
                  {person.interests.length > 0 ? (
                    person.interests.map((int, i) => (
                      <Badge key={i} variant="secondary" className="font-medium text-xs">
                        {int}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Relationship Context & Notes</h4>
                <Card className="p-3.5 bg-muted/20 border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {person.notes || 'No general notes recorded.'}
                </Card>
              </div>

              {/* Associated Programs */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Connected Programs</h4>
                {personPrograms.length > 0 ? (
                  <div className="space-y-2">
                    {personPrograms.map(pr => (
                      <Card 
                        key={pr.id}
                        onClick={() => onNavigateToProgram && onNavigateToProgram(pr.id)}
                        className="p-3 border-border hover:border-primary/40 hover:bg-muted/30 flex items-center justify-between text-xs cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{pr.name}</span>
                          <Badge variant="outline" className="text-[10px]">{pr.status}</Badge>
                        </div>
                        <span className="text-primary font-medium flex items-center gap-1">View program &rarr;</span>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not currently assigned to any active programs.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Follow-up Tasks</h4>
                  <p className="text-xs text-muted-foreground">Deliverables and action items linked to {person.name}</p>
                </div>
                {canCreateTask ? (
                  <Button
                    onClick={() => setShowAddTask(!showAddTask)}
                    id="btn-add-task-in-modal"
                    variant="crimson"
                    size="sm"
                    className="h-8 text-xs font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add task</span>
                  </Button>
                ) : (
                  <Button
                    disabled
                    id="btn-add-task-in-modal-disabled"
                    title={Permissions.getDisabledReason('tasks', 'create')}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold cursor-not-allowed select-none opacity-60"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    <span>Add task</span>
                  </Button>
                )}
              </div>

              {/* Add Task Form */}
              {showAddTask && (
                <Card className="p-4 bg-muted/30 border-border space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Task Title</label>
                    <Input 
                      type="text"
                      required
                      placeholder="e.g. Schedule follow-up call regarding workshop slides"
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Due Date</label>
                      <Input 
                        type="date"
                        required
                        value={taskDueDate}
                        onChange={e => setTaskDueDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Priority</label>
                      <select 
                        value={taskPriority}
                        onChange={e => setTaskPriority(e.target.value as any)}
                        className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddTask(false)}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      variant="crimson"
                      size="sm"
                      onClick={handleCreateTask}
                      className="text-xs h-8"
                    >
                      Save Task
                    </Button>
                  </div>
                </Card>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                {personTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No open tasks for this person.</p>
                ) : (
                  personTasks.map(task => (
                    <Card 
                      key={task.id}
                      className="p-3 border-border flex items-center justify-between gap-3 bg-card hover:border-primary/40 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                            task.status === 'Completed'
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-input hover:border-emerald-600 bg-card'
                          }`}
                          title={task.status === 'Completed' ? 'Mark as Incomplete' : 'Mark as Done'}
                        >
                          {task.status === 'Completed' && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-semibold ${task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {task.title}
                            </p>
                            {task.status === 'Completed' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                Done
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">Due {task.dueDate} • Assigned to {task.owner}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={task.priority === 'High' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {task.priority}
                      </Badge>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Linked Documents</h4>
                <p className="text-xs text-muted-foreground">Google Drive links and files associated with {person.name}</p>
              </div>

              {personDocs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-muted/10">
                  <FileText className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No documents linked to this person yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {personDocs.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-muted/20 flex items-center justify-between text-xs group transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{doc.title}</p>
                          <p className="text-[11px] text-muted-foreground">{doc.type} • Added {doc.addedAt}</p>
                        </div>
                      </div>
                      <span className="text-muted-foreground group-hover:text-primary font-medium flex items-center gap-1">Open &rarr;</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
