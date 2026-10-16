import React, { useState } from 'react';
import { 
  Compass, 
  Search, 
  Plus, 
  Calendar, 
  Users, 
  Target, 
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Program, ProgramStatus } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProgramDetailModal } from './ProgramDetailModal';
import { ProtectedAction } from '../common/ProtectedAction';
import { 
  Button, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  Input, 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  OneUiSearchBar
} from '../ui';

const STATUS_FILTERS: Array<ProgramStatus | 'All'> = [
  'All',
  'Active',
  'Planning',
  'On Hold',
  'Completed',
  'Archived'
];

interface ProgramsViewProps {
  selectedProgramId?: string | null;
  onSelectProgram: (id: string | null) => void;
  onSelectPerson: (personId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 26,
    },
  },
};

export const ProgramsView: React.FC<ProgramsViewProps> = ({
  selectedProgramId,
  onSelectProgram,
  onSelectPerson,
  onSelectEvent
}) => {
  const { scopedPrograms, programs, addProgram, currentUser, people, events, hasPermission } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ProgramStatus | 'All'>('All');

  // Filter based on administrator configured data scope
  const visiblePrograms = (currentUser.roleId === 'super_admin' || currentUser.roleId === 'staff_manager' || currentUser.dataScope?.programs === 'ALL')
    ? programs
    : scopedPrograms;

  // Add Program Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState<ProgramStatus>('Active');
  const [newOwner, setNewOwner] = useState(currentUser.name);
  const [newStartDate, setNewStartDate] = useState('2026-10-01');
  const [newEndDate, setNewEndDate] = useState('2027-03-31');
  const [newFocusAreas, setNewFocusAreas] = useState('');
  const [newOutcomes, setNewOutcomes] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const filteredPrograms = visiblePrograms.filter(pr => {
    const matchesFilter = selectedFilter === 'All' ? true : pr.status === selectedFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true : 
      pr.name.toLowerCase().includes(q) ||
      pr.description.toLowerCase().includes(q) ||
      pr.ownerName.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created = addProgram({
      name: newName.trim(),
      description: newDesc.trim(),
      status: newStatus,
      startDate: newStartDate,
      endDate: newEndDate,
      ownerName: newOwner,
      progressPercent: 10,
      focusAreas: newFocusAreas.split(',').map(s => s.trim()).filter(Boolean),
      outcomes: newOutcomes.trim() || undefined,
      budgetCad: newBudget ? Number(newBudget) : undefined,
      participantIds: [],
      partnerIds: []
    });

    setNewName('');
    setNewDesc('');
    setNewFocusAreas('');
    setNewOutcomes('');
    setNewBudget('');
    setShowAddModal(false);
    onSelectProgram(created.id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with shadcn button & serif typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-serif">
            Programs & Cohorts
          </h2>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            Core community initiatives, youth leadership cohorts, and accessibility research labs.
          </p>
        </div>

        <ProtectedAction resource="programs" action="create">
          <Button
            onClick={() => setShowAddModal(true)}
            id="btn-create-program"
            variant="crimson"
            className="shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create program</span>
          </Button>
        </ProtectedAction>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <OneUiSearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search programs by name, description, or lead..."
          />
        </div>

        <div className="text-xs text-zinc-500 self-center">
          Showing <strong className="text-zinc-900">{filteredPrograms.length}</strong> of {programs.length} programs
        </div>
      </div>

      {/* Status pills with smooth animated active state */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map(status => {
          const isSelected = selectedFilter === status;
          return (
            <button
              key={status}
              onClick={() => setSelectedFilter(status)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer select-none apple-tap ${
                isSelected
                  ? 'text-white'
                  : 'bg-white border border-zinc-200/90 text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="programFilterPill"
                  className="absolute inset-0 rounded-full bg-[#140a8e] shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
              <span className="relative z-10">{status}</span>
            </button>
          );
        })}
      </div>

      {/* Embedded Program AI Summary (Section 31) */}
      <div className="bg-gradient-to-r from-[#140a8e]/5 via-zinc-50 to-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#140a8e]/10 text-[#140a8e] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ea0543]" />
              <span>Program Intelligence</span>
            </span>
            <span className="text-xs text-zinc-400 font-mono">Cohort Engagement Analysis</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-900 font-serif">
            Youth Leadership Initiative · 18 Active Participants · 82% Avg Attendance
          </h4>
          <p className="text-xs text-zinc-600 max-w-2xl leading-relaxed">
            AI Observation: Participation has remained stable over the last 3 sessions. 2 participants have attended every session. Consider reviewing engagement patterns before the next session.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="bg-white text-zinc-700 text-xs py-1 px-2.5">
            4 events completed
          </Badge>
        </div>
      </div>

      {/* Programs Bento Grid with animated stagger & shadcn cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {filteredPrograms.map(pr => {
          const prParticipants = people.filter(p => pr.participantIds.includes(p.id) || p.programIds.includes(pr.id));
          const prEvents = events.filter(e => e.programId === pr.id);

          return (
            <motion.div
              key={pr.id}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectProgram(pr.id)}
              className="cursor-pointer group flex"
            >
              <Card className="w-full flex flex-col justify-between overflow-hidden border-zinc-200/80 hover:border-[#140a8e]/35 hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge 
                      variant={
                        pr.status === 'Active' ? 'crimson' :
                        pr.status === 'Planning' ? 'indigo' : 'secondary'
                      }
                    >
                      {pr.status}
                    </Badge>
                    <span className="text-[11px] text-zinc-400 font-medium">Lead: {pr.ownerName}</span>
                  </div>

                  <CardTitle className="text-base sm:text-lg font-serif group-hover:text-[#140a8e] transition-colors leading-snug">
                    {pr.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1.5">
                    {pr.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-2">
                  {/* Milestones Progress Bar with Motion Spring */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-zinc-500 font-medium">Milestones completed</span>
                      <span className="font-bold text-zinc-800">{pr.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#f2f0f2] h-2 rounded-full overflow-hidden border border-zinc-200/60">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pr.progressPercent}%` }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-[#ea0543] h-full rounded-full"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium text-zinc-700">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      {prParticipants.length} people
                    </span>
                    <span className="flex items-center gap-1 font-medium text-zinc-700">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {prEvents.length} events
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-[#140a8e] group-hover:text-[#ea0543] group-hover:underline inline-flex items-center gap-1 transition-colors">
                    Workspace
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Create Program Modal using shadcn Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Program / Cohort</DialogTitle>
            <DialogDescription>
              Launch a community initiative, corporate equity partnership, or youth cohort.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProgram} className="space-y-3.5 py-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Program Name *</label>
              <Input 
                type="text"
                required
                placeholder="e.g. Immigrant Youth Leadership Initiative"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Program Description *</label>
              <textarea 
                rows={2}
                required
                placeholder="Goals, target community, and scope of this initiative..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-[#140a8e]/20 focus:border-[#140a8e] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Initial Status</label>
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as ProgramStatus)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-zinc-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#140a8e]/20 focus:border-[#140a8e]"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Program Lead</label>
                <Input 
                  type="text"
                  value={newOwner}
                  onChange={e => setNewOwner(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date</label>
                <Input 
                  type="date"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">End Date</label>
                <Input 
                  type="date"
                  value={newEndDate}
                  onChange={e => setNewEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Focus Areas (comma separated)</label>
              <Input 
                type="text"
                placeholder="Youth empowerment, Civic education, Mentorship"
                value={newFocusAreas}
                onChange={e => setNewFocusAreas(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Outcomes</label>
              <Input 
                type="text"
                placeholder="e.g. 25 youth completed, 4 community projects launched"
                value={newOutcomes}
                onChange={e => setNewOutcomes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="crimson"
              >
                Create Program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Detail Modal */}
      {selectedProgramId && (
        <ProgramDetailModal
          programId={selectedProgramId}
          isOpen={!!selectedProgramId}
          onClose={() => onSelectProgram(null)}
          onSelectPerson={onSelectPerson}
          onSelectEvent={onSelectEvent}
        />
      )}
    </div>
  );
};
