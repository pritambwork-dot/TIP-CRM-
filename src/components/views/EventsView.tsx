import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  MapPin, 
  Clock, 
  Users, 
  Compass, 
  CheckCircle2,
  Video,
  Lock,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem, EventType } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { EventDetailModal } from './EventDetailModal';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';

const EVENT_TYPE_FILTERS: Array<EventType | 'All'> = [
  'All',
  'Workshop',
  'Consultation',
  'Community Forum',
  'Training',
  'Panel',
  'Youth Lab'
];

interface EventsViewProps {
  selectedEventId?: string | null;
  onSelectEvent: (id: string | null) => void;
  onSelectPerson: (personId: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  selectedEventId,
  onSelectEvent,
  onSelectPerson
}) => {
  const { events, addEvent, programs, participants, hasPermission, Permissions } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<EventType | 'All'>('All');

  const canCreateEvent = hasPermission('events', 'create');

  // Add event modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<EventType>('Workshop');
  const [newDate, setNewDate] = useState('2026-10-15');
  const [newTime, setNewTime] = useState('14:00 - 16:00 EDT');
  const [newLocation, setNewLocation] = useState('Centre for Social Innovation (Toronto) & Zoom');
  const [newFacilitator, setNewFacilitator] = useState('Ruth Mojeed Ramirez');
  const [newCapacity, setNewCapacity] = useState('35');
  const [newProgramId, setNewProgramId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filteredEvents = events.filter(e => {
    const matchesFilter = selectedFilter === 'All' ? true : e.type === selectedFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true :
      e.name.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.facilitator.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.date.toLowerCase().includes(q) ||
      e.time.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created = addEvent({
      name: newName.trim(),
      type: newType,
      date: newDate,
      time: newTime.trim(),
      location: newLocation.trim(),
      isOnline: newLocation.toLowerCase().includes('zoom') || newLocation.toLowerCase().includes('online'),
      facilitator: newFacilitator.trim(),
      partnerIds: [],
      capacity: Number(newCapacity) || 25,
      programId: newProgramId || undefined,
      notes: newNotes.trim() || undefined
    });

    setNewName('');
    setNewNotes('');
    setShowAddModal(false);
    onSelectEvent(created.id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Events & Community Workshops</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Schedule civic consultations, accessibility trainings, and track attendance rosters.
          </p>
        </div>

        <ProtectedAction resource="events" action="create">
          <Button
            onClick={() => setShowAddModal(true)}
            id="btn-create-event"
            variant="crimson"
            className="shadow-sm active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Create event</span>
          </Button>
        </ProtectedAction>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events by title, location, date, or facilitator..."
            className="pl-9 pr-9 bg-card border-border/80 text-xs sm:text-sm h-10 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 rounded-full hover:bg-muted/80 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground self-center">
          Showing <strong className="text-foreground">{filteredEvents.length}</strong> of {events.length} events
        </div>
      </div>

      {/* Event type pills with Motion Layout */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {EVENT_TYPE_FILTERS.map(type => {
          const isActive = selectedFilter === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedFilter(type)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="eventsCategoryActive"
                  className="absolute inset-0 bg-[#ea0543] rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{type}</span>
            </button>
          );
        })}
      </div>

      {/* Embedded Event AI Insights (Section 32) */}
      <div className="bg-gradient-to-r from-[#ea0543]/5 via-zinc-50 to-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#ea0543]/10 text-[#ea0543] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ea0543]" />
              <span>Event Attendance Insights</span>
            </span>
            <span className="text-xs text-zinc-400 font-mono">Benchmark: 78.4% Program Avg</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-900 font-serif">
            Youth Leadership Lab — Civic Engagement · 42 Registered · 34 Attended (81% Rate)
          </h4>
          <p className="text-xs text-zinc-600 max-w-2xl leading-relaxed">
            AI Observation: Attendance was 6 percentage points above the program average. Suggested follow-up: Review the 8 registered-but-absent participants in Tasks for potential reminder outreach.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="bg-white text-zinc-700 text-xs py-1 px-2.5">
            +6% vs baseline
          </Badge>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map((evt, idx) => {
          const associatedProgram = programs.find(p => p.id === evt.programId);
          const eventParticipants = participants.filter(p => p.eventId === evt.id);
          const attended = eventParticipants.filter(p => p.status === 'Attended').length;

          return (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.3) }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              onClick={() => onSelectEvent(evt.id)}
              className="cursor-pointer group"
            >
              <Card className="h-full p-5 border-border/80 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between bg-card">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                      {evt.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {evt.date}
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
                    {evt.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {evt.notes || 'Community workshop scheduled by TIP.'}
                  </p>

                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{evt.time}</span>
                    </p>
                    <p className="flex items-center gap-2 truncate">
                      {evt.isOnline ? (
                        <Video className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      )}
                      <span className="truncate">{evt.location}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span>
                      <strong className="text-foreground">{eventParticipants.length}</strong> / {evt.capacity} registered
                    </span>
                    {attended > 0 && (
                      <Badge variant="success" className="text-[10px] py-0 px-1.5 font-semibold">
                        {attended} attended
                      </Badge>
                    )}
                  </div>

                  {associatedProgram && (
                    <span className="text-[11px] text-muted-foreground/80 truncate max-w-[120px]">
                      {associatedProgram.name}
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Create Event Modal */}
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
                  <h3 className="text-base font-serif font-bold text-foreground">Schedule Event / Workshop</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Plan a new civic engagement session or training</p>
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

              <form onSubmit={handleCreateEvent} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Event Title *</label>
                  <Input 
                    type="text"
                    required
                    placeholder="e.g. Civic Engagement Lab & Accessibility Workshop"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Type</label>
                    <select 
                      value={newType}
                      onChange={e => setNewType(e.target.value as EventType)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      {EVENT_TYPE_FILTERS.filter(f => f !== 'All').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Connected Program</label>
                    <select 
                      value={newProgramId}
                      onChange={e => setNewProgramId(e.target.value)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      <option value="">None / Standalone Event</option>
                      {programs.map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Date</label>
                    <Input 
                      type="date"
                      required
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Time Range</label>
                    <Input 
                      type="text"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      placeholder="e.g. 13:00 - 15:30 EDT"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Location or Virtual Link</label>
                  <Input 
                    type="text"
                    placeholder="e.g. 215 Spadina Ave, Suite 400, Toronto OR Zoom Link"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Facilitator / Host</label>
                    <Input 
                      type="text"
                      value={newFacilitator}
                      onChange={e => setNewFacilitator(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Participant Capacity</label>
                    <Input 
                      type="number"
                      value={newCapacity}
                      onChange={e => setNewCapacity(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Description & Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="Workshop agenda, learning objectives, or participant prep..."
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
                    Save Event
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Detail Modal */}
      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          isOpen={!!selectedEventId}
          onClose={() => onSelectEvent(null)}
          onSelectPerson={onSelectPerson}
        />
      )}
    </div>
  );
};
