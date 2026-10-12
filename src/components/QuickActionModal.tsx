import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  CalendarPlus, 
  Compass, 
  CheckSquare, 
  MessageSquarePlus, 
  HeartHandshake, 
  X,
  FilePlus,
  PenLine,
  Search,
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { InteractionType, Person } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Card } from './ui/card';

export type QuickActionType = 
  | 'quick_note'
  | 'person'
  | 'event'
  | 'program'
  | 'task'
  | 'interaction'
  | 'funding'
  | 'document';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction: (type: QuickActionType) => void;
  initialMode?: 'menu' | 'quick_note';
  initialPersonId?: string | null;
  onNavigateToPerson?: (personId: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onTriggerAction,
  initialMode = 'menu',
  initialPersonId = null,
  onNavigateToPerson
}) => {
  const { currentUser, people, updatePerson, addInteraction, addTask, hasPermission, Permissions } = useCrm();
  const isVolunteer = currentUser.role === 'volunteer';

  // Mode state: 'menu' or 'quick_note'
  const [mode, setMode] = useState<'menu' | 'quick_note'>(initialMode);
  
  // Quick Note Form state
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [isChangingContact, setIsChangingContact] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [interactionType, setInteractionType] = useState<InteractionType>('Note');
  const [followUpDate, setFollowUpDate] = useState('');
  const [createFollowUpTask, setCreateFollowUpTask] = useState(false);
  
  // Feedback state
  const [submittedPerson, setSubmittedPerson] = useState<Person | null>(null);
  const [lastAppendedEntry, setLastAppendedEntry] = useState<{
    personName: string;
    personId: string;
    entry: string;
  } | null>(null);

  // Sync mode and selected person when opened or changed
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSubmittedPerson(null);
      setLastAppendedEntry(null);
      setNoteText('');
      setFollowUpDate('');
      setCreateFollowUpTask(false);
      setIsChangingContact(false);
      setContactSearchQuery('');

      if (initialPersonId && people.some(p => p.id === initialPersonId)) {
        setSelectedPersonId(initialPersonId);
      } else if (people.length > 0 && !selectedPersonId) {
        setSelectedPersonId(people[0].id);
      }
    }
  }, [isOpen, initialMode, initialPersonId, people]);

  // Selected person object
  const selectedPerson = useMemo(() => {
    return people.find(p => p.id === selectedPersonId) || people[0] || null;
  }, [people, selectedPersonId]);

  // Filtered people for quick contact search
  const filteredContacts = useMemo(() => {
    const q = contactSearchQuery.toLowerCase().trim();
    if (!q) return people.slice(0, 8);
    return people.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.organizationName && p.organizationName.toLowerCase().includes(q)) ||
      (p.role && p.role.toLowerCase().includes(q)) ||
      p.relationshipTypes.some(t => t.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [people, contactSearchQuery]);

  // Current formatted timestamp (TIP reference date: Sep 18, 2026)
  const todayStr = '2026-09-18';
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const roleLabel = currentUser.role === 'staff' ? 'Staff' : 'Volunteer';
  const timestampHeader = `[${todayStr} ${timeStr} — ${currentUser.name} (${roleLabel})]`;

  // Handle Quick Note Submission
  const handleAppendNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !noteText.trim()) return;

    const formattedEntry = `${timestampHeader}\n${noteText.trim()}`;
    const updatedNotes = selectedPerson.notes && selectedPerson.notes.trim()
      ? `${selectedPerson.notes.trim()}\n\n${formattedEntry}`
      : formattedEntry;

    // 1. Update Person record (profile notes, lastInteractionDate, optional nextFollowUpDate)
    updatePerson(selectedPerson.id, {
      notes: updatedNotes,
      lastInteractionDate: todayStr,
      nextFollowUpDate: followUpDate || selectedPerson.nextFollowUpDate
    });

    // 2. Log an InteractionItem (so it populates timeline and updates Weekly Activity sparkline)
    addInteraction({
      personId: selectedPerson.id,
      personName: selectedPerson.name,
      organizationId: selectedPerson.organizationId,
      organizationName: selectedPerson.organizationName,
      type: interactionType,
      date: todayStr,
      summary: noteText.trim().length > 70 ? noteText.trim().slice(0, 67) + '...' : noteText.trim(),
      details: noteText.trim(),
      authorName: currentUser.name,
      followUpDate: followUpDate || undefined
    });

    // 3. Optional automatic follow-up task
    if (createFollowUpTask && followUpDate) {
      addTask({
        title: `Follow-up with ${selectedPerson.name}: ${noteText.trim().slice(0, 40)}...`,
        owner: currentUser.name,
        dueDate: followUpDate,
        priority: 'Medium',
        status: 'To Do',
        relatedRecordType: 'Person',
        relatedRecordId: selectedPerson.id,
        relatedRecordName: selectedPerson.name
      });
    }

    setLastAppendedEntry({
      personName: selectedPerson.name,
      personId: selectedPerson.id,
      entry: formattedEntry
    });
    setSubmittedPerson(selectedPerson);
  };

  if (!isOpen) return null;

  const actions: Array<{
    type: QuickActionType;
    title: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
    isPrimary?: boolean;
    isAllowed: boolean;
    disabledReason: string;
    requiredRoleLabel?: string;
  }> = [
    {
      type: 'quick_note',
      title: 'Quick Note',
      description: 'Append a timestamped ad-hoc note to a contact profile immediately',
      icon: PenLine,
      badge: 'Fast log',
      isPrimary: true,
      isAllowed: hasPermission('interactions', 'create'),
      disabledReason: 'You do not have permission to append notes'
    },
    {
      type: 'person',
      title: 'Add person',
      description: 'Add a new partner, participant, volunteer, or community contact',
      icon: UserPlus,
      isAllowed: hasPermission('people', 'create'),
      disabledReason: 'Volunteers cannot create new contact profiles',
      requiredRoleLabel: 'Staff+'
    },
    {
      type: 'interaction',
      title: 'Log interaction',
      description: 'Record an email, call, meeting, or workshop attendance note',
      icon: MessageSquarePlus,
      isAllowed: hasPermission('interactions', 'create'),
      disabledReason: 'You do not have permission to log interactions'
    },
    {
      type: 'task',
      title: 'Add task',
      description: 'Assign a follow-up, deadline, or deliverable with due date',
      icon: CheckSquare,
      isAllowed: hasPermission('tasks', 'create'),
      disabledReason: 'You do not have permission to create tasks'
    },
    {
      type: 'event',
      title: 'Create event',
      description: 'Schedule a community workshop, panel, or consultation',
      icon: CalendarPlus,
      isAllowed: hasPermission('events', 'create'),
      disabledReason: 'Volunteers cannot create new events',
      requiredRoleLabel: 'Staff+'
    },
    {
      type: 'program',
      title: 'Create program',
      description: 'Start a new initiative, research project, or community cohort',
      icon: Compass,
      isAllowed: hasPermission('programs', 'create'),
      disabledReason: 'Program creation requires Staff Manager or Super Admin role',
      requiredRoleLabel: 'Manager+'
    },
    {
      type: 'funding',
      title: 'Add funding record',
      description: 'Record a grant disbursement, foundation award, or contribution',
      icon: HeartHandshake,
      isAllowed: hasPermission('funding', 'create'),
      disabledReason: 'Only Super Admins can log or allocate funding records',
      requiredRoleLabel: 'Super Admin'
    },
    {
      type: 'document',
      title: 'Link cloud document',
      description: 'Attach a Google Drive folder, Google Sheet roster, or proposal',
      icon: FilePlus,
      isAllowed: hasPermission('documents', 'create'),
      disabledReason: 'Volunteers cannot link documents',
      requiredRoleLabel: 'Staff+'
    }
  ];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', duration: 0.25 }}
          className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ================= MODE: QUICK NOTE SUCCESS STATE ================= */}
          {mode === 'quick_note' && submittedPerson ? (
            <div>
              <div className="p-4 border-b border-border flex items-center justify-between bg-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-semibold">Note Successfully Appended</h3>
                </div>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                <Card className="p-3.5 bg-muted/30 border-border text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-foreground">
                      {submittedPerson.name} {submittedPerson.organizationName ? `(${submittedPerson.organizationName})` : ''}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium">Profile Updated</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-card border border-border font-mono text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">
                    {lastAppendedEntry?.entry}
                  </div>
                  {followUpDate && (
                    <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Next follow-up scheduled for: {followUpDate}
                      {createFollowUpTask && ' • Task added to dashboard'}
                    </p>
                  )}
                </Card>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubmittedPerson(null);
                      setNoteText('');
                      setFollowUpDate('');
                      setCreateFollowUpTask(false);
                    }}
                    className="w-full sm:w-auto text-xs"
                  >
                    Append another note
                  </Button>

                  {onNavigateToPerson && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onNavigateToPerson(submittedPerson.id);
                        onClose();
                      }}
                      className="w-full sm:w-auto text-xs gap-1.5"
                    >
                      <span>View {submittedPerson.name}'s Profile</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="crimson"
                    size="sm"
                    onClick={onClose}
                    className="w-full sm:w-auto text-xs font-semibold shadow-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          ) : mode === 'quick_note' ? (
          /* ================= MODE: QUICK NOTE COMPOSER ================= */
          <div>
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setMode('menu')}
                  className="p-1 -ml-1 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-200/70 transition-colors cursor-pointer"
                  title="Back to quick actions"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">Quick Note on Contact</h3>
                    <span className="text-[10px] bg-zinc-900 text-white font-semibold px-2 py-0.5 rounded-full">
                      Ad-hoc Log
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Append a timestamped interaction note directly to a profile
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Note Form */}
            <form onSubmit={handleAppendNote} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* 1. Contact Selector Card */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-800">
                    Contact / Person *
                  </label>
                  {selectedPerson && !isChangingContact && (
                    <button
                      type="button"
                      onClick={() => setIsChangingContact(true)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 font-semibold cursor-pointer"
                    >
                      Change contact
                    </button>
                  )}
                </div>

                {isChangingContact || !selectedPerson ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search contact by name, role, or organization..."
                        value={contactSearchQuery}
                        onChange={e => setContactSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-zinc-300 focus:ring-1 focus:ring-zinc-900 bg-white"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100 bg-white">
                      {filteredContacts.length === 0 ? (
                        <p className="p-3 text-xs text-zinc-400 text-center">No matching contacts found</p>
                      ) : (
                        filteredContacts.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPersonId(p.id);
                              setIsChangingContact(false);
                            }}
                            className={`p-2.5 text-xs flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors ${
                              p.id === selectedPersonId ? 'bg-zinc-50/90 font-semibold' : ''
                            }`}
                          >
                            <div>
                              <span className="font-semibold text-zinc-900">{p.name}</span>
                              <span className="text-zinc-400 ml-1.5">• {p.organizationName || p.role || 'Contact'}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {p.relationshipTypes[0]}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Active Contact Card Preview */
                  <div className="p-3 rounded-lg bg-zinc-50/90 border border-zinc-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                        {selectedPerson.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900 truncate">{selectedPerson.name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-600 font-medium shrink-0">
                            {selectedPerson.relationshipTypes[0] || 'Stakeholder'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {selectedPerson.organizationName ? `${selectedPerson.organizationName} • ` : ''}
                          {selectedPerson.role || selectedPerson.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-zinc-400 block font-medium">Last active</span>
                      <span className="text-[11px] font-semibold text-zinc-700">
                        {selectedPerson.lastInteractionDate || 'Never'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Channel Tag & Real-time Timestamp Strip */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Channel / Touchpoint
                  </label>
                  <select
                    value={interactionType}
                    onChange={e => setInteractionType(e.target.value as InteractionType)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white"
                  >
                    <option value="Note">Quick Note / Internal</option>
                    <option value="Call">Phone Call</option>
                    <option value="Meeting">Meeting / Sync</option>
                    <option value="Email">Email Thread</option>
                    <option value="Follow-up">Follow-up Check-in</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Timestamp
                  </label>
                  <div className="w-full text-xs p-2 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium truncate">{todayStr} • {timeStr}</span>
                  </div>
                </div>
              </div>

              {/* 3. Note Content */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1">
                  Ad-hoc Note Details *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Quick phone sync: Confirmed workshop accessibility requirements and approved participant travel bursary drawdown."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-zinc-300 focus:ring-1 focus:ring-zinc-900 bg-white leading-relaxed placeholder:text-zinc-400"
                  autoFocus
                />
              </div>

              {/* 4. Optional Follow-up Date & Task */}
              <div className="p-3 rounded-lg bg-zinc-50/70 border border-zinc-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">
                    Schedule Future Follow-up?
                  </label>
                  <span className="text-[10px] text-zinc-400">Optional</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-zinc-300 bg-white"
                  />
                  {followUpDate && (
                    <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={createFollowUpTask}
                        onChange={e => setCreateFollowUpTask(e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                      />
                      <span>Create dashboard task</span>
                    </label>
                  )}
                </div>
              </div>

              {/* 5. Live Profile Append Preview */}
              {noteText.trim() && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Profile Append Preview
                  </span>
                  <div className="p-2.5 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[11px] leading-relaxed border border-zinc-800">
                    <p className="text-zinc-400 font-bold">{timestampHeader}</p>
                    <p className="text-zinc-100 mt-1 whitespace-pre-wrap">{noteText.trim()}</p>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Appended permanently to {selectedPerson?.name}'s notes and logged in interaction timeline.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('menu')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="crimson"
                  size="sm"
                  disabled={!selectedPerson || !noteText.trim()}
                  className="shadow-sm"
                >
                  <PenLine className="w-3.5 h-3.5 mr-1.5" />
                  <span>Append Note to Profile</span>
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* ================= MODE: MAIN QUICK ACTION MENU ================= */
          <div>
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="text-base font-serif font-bold text-foreground">Quick Actions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">What would you like to record today?</p>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-3.5 grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto">
              {actions.map(action => {
                const Icon = action.icon;
                const isQuickNote = action.type === 'quick_note';
                const isAllowed = action.isAllowed;

                return (
                  <button
                    key={action.type}
                    disabled={!isAllowed}
                    title={!isAllowed ? action.disabledReason : undefined}
                    onClick={() => {
                      if (!isAllowed) return;
                      if (isQuickNote) {
                        setMode('quick_note');
                      } else {
                        onTriggerAction(action.type);
                        onClose();
                      }
                    }}
                    className={`w-full p-3 rounded-xl border flex items-start gap-3.5 text-left transition-all ${
                      !isAllowed
                        ? 'opacity-45 bg-muted/30 border-border cursor-not-allowed select-none'
                        : isQuickNote 
                          ? 'border-[#ea0543]/40 bg-[#ea0543]/5 hover:bg-[#ea0543]/10 hover:border-[#ea0543]/60 shadow-2xs cursor-pointer group' 
                          : 'border-border/70 hover:border-primary/40 hover:bg-muted/40 cursor-pointer group'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      !isAllowed
                        ? 'bg-muted text-muted-foreground'
                        : isQuickNote 
                          ? 'bg-[#ea0543] text-white' 
                          : 'bg-muted group-hover:bg-[#140a8e] group-hover:text-white text-foreground'
                    }`}>
                      {!isAllowed ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold ${!isAllowed ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary'}`}>
                          {action.title}
                        </h4>
                        {action.badge && isAllowed && (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
                            {action.badge}
                          </Badge>
                        )}
                        {!isAllowed && action.requiredRoleLabel && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            {action.requiredRoleLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {!isAllowed ? action.disabledReason : action.description}
                      </p>
                    </div>
                    {isAllowed && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary shrink-0 self-center transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-muted/20 border-t border-border text-center">
              <p className="text-[11px] text-muted-foreground">
                The Inclusion Project CRM • Rapid Workflow Operations
              </p>
            </div>
          </div>
        )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

