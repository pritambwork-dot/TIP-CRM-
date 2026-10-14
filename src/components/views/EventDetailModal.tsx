import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Download, 
  UserPlus, 
  ExternalLink, 
  FileText,
  Clock,
  Video,
  Trash2,
  Lock
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { ParticipantStatus } from '../../types';
import { ProtectedAction } from '../common/ProtectedAction';
import { exportToCsv } from '../../lib/csvExport';
import { sanitizeExternalUrl } from '../../lib/safeUrls';

interface EventDetailModalProps {
  eventId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
}

const ATTENDANCE_STATUSES: ParticipantStatus[] = [
  'Registered',
  'Attended',
  'Did not attend',
  'Waitlisted',
  'Withdrawn'
];

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  eventId,
  isOpen,
  onClose,
  onSelectPerson
}) => {
  const { 
    events, 
    participants,
    updateParticipantStatus,
    addParticipant,
    deleteEvent,
    people, 
    programs,
    documents,
    hasPermission,
    Permissions
  } = useCrm();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedPersonIdToAdd, setSelectedPersonIdToAdd] = useState('');

  const canEditEvent = hasPermission('events', 'edit');
  const canDeleteEvent = hasPermission('events', 'delete');
  const canExport = hasPermission('reports', 'export');

  const event = events.find(e => e.id === eventId);
  if (!isOpen || !event) return null;

  const associatedProgram = programs.find(p => p.id === event.programId);
  const eventDocs = documents.filter(d => d.relatedType === 'Event' && d.relatedId === event.id);

  // Participants belonging to this event
  const eventParticipants = participants.filter(p => p.eventId === event.id);

  // Unregistered people available to add
  const unregisteredPeople = people.filter(p => !eventParticipants.some(ep => ep.personId === p.id));

  const attendedCount = eventParticipants.filter(p => p.status === 'Attended').length;
  const registeredCount = eventParticipants.filter(p => p.status === 'Registered').length;

  const handleAddParticipant = () => {
    if (!selectedPersonIdToAdd) return;
    const person = people.find(p => p.id === selectedPersonIdToAdd);
    if (!person) return;

    addParticipant({
      personId: person.id,
      personName: person.name,
      personEmail: person.email,
      organizationName: person.organizationName,
      eventId: event.id,
      eventName: event.name,
      programId: event.programId,
      programName: event.programName,
      status: 'Registered'
    });

    setSelectedPersonIdToAdd('');
    setShowAddParticipant(false);
  };

  // Export attendance list as CSV
  const handleExportCSV = () => {
    const rows = [
      ['Person Name', 'Email', 'Organization', 'Status', 'Registered Date', 'Attended Date'],
      ...eventParticipants.map(p => [
        p.personName,
        p.personEmail,
        p.organizationName || '',
        p.status,
        p.registeredAt,
        p.attendedAt || ''
      ])
    ];

    exportToCsv(`TIP_${event.name.replace(/\s+/g, '_')}_Attendance.csv`, rows);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 flex items-start justify-between bg-zinc-50/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-white">
                {event.type}
              </span>
              {associatedProgram && (
                <span className="text-xs text-zinc-600 font-medium">
                  Program: <strong>{associatedProgram.name}</strong>
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{event.name}</h3>

            <div className="mt-2 space-y-1 text-xs text-zinc-600">
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{event.date} • {event.time}</span>
              </p>
              <p className="flex items-center gap-1.5">
                {event.isOnline ? (
                  <Video className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>{event.location}</span>
                {event.meetingLink && sanitizeExternalUrl(event.meetingLink) && (
                  <a 
                    href={sanitizeExternalUrl(event.meetingLink)!} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1"
                  >
                    Join link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <ProtectedAction resource="events" action="delete" mode="disable" showLockIcon={false}>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete the event "${event.name}"?`)) {
                    deleteEvent(event.id);
                    onClose();
                  }
                }}
                id="btn-delete-event"
                title="Super Admin: Delete Event"
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </ProtectedAction>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="px-6 py-3 bg-white border-b border-zinc-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="text-zinc-600">
              Capacity: <strong className="text-zinc-900">{event.capacity}</strong>
            </div>
            <div className="text-zinc-600">
              Registered: <strong className="text-zinc-900">{eventParticipants.length}</strong>
            </div>
            <div className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
              Attended: <strong>{attendedCount}</strong>
            </div>
          </div>

          <ProtectedAction resource="reports" action="export">
            <button
              onClick={handleExportCSV}
              id="btn-export-roster-csv"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950 cursor-pointer"
              title="Download CSV roster"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </ProtectedAction>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notes & Facilitator */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Overview & Facilitators</h4>
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-3.5 rounded-lg border border-zinc-200">
              {event.notes || 'Community session organized by TIP.'}
            </p>
            <div className="mt-2 text-xs text-zinc-500">
              Facilitator / Speakers: <strong className="text-zinc-800">{event.facilitator}</strong>
            </div>
          </div>

          {/* Participant Attendance Tracker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Participant Roster & Attendance</h4>
                <p className="text-xs text-zinc-500">Mark who attended or no-showed with one click</p>
              </div>

              <ProtectedAction resource="events" action="edit">
                <button
                  onClick={() => setShowAddParticipant(!showAddParticipant)}
                  id="btn-add-participant"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add participant</span>
                </button>
              </ProtectedAction>
            </div>

            {/* Inline add participant select */}
            {showAddParticipant && (
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center gap-2">
                <select
                  value={selectedPersonIdToAdd}
                  onChange={e => setSelectedPersonIdToAdd(e.target.value)}
                  className="flex-1 text-xs p-2 rounded border border-zinc-300 bg-white"
                >
                  <option value="">Select a contact from TIP directory...</option>
                  {unregisteredPeople.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role || p.email})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddParticipant}
                  className="px-3 py-2 bg-zinc-900 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Register
                </button>
                <button
                  onClick={() => setShowAddParticipant(false)}
                  className="px-2 py-2 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Participant Table */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {eventParticipants.map(part => (
                    <tr key={part.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3">
                        <p 
                          onClick={() => onSelectPerson(part.personId)}
                          className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                        >
                          {part.personName}
                        </p>
                        <p className="text-[11px] text-zinc-500">{part.personEmail}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          part.status === 'Attended' ? 'bg-emerald-50 text-emerald-700' :
                          part.status === 'Did not attend' ? 'bg-rose-50 text-rose-700' :
                          part.status === 'Withdrawn' ? 'bg-zinc-200 text-zinc-600' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {part.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {ATTENDANCE_STATUSES.map(st => (
                            <button
                              key={st}
                              onClick={() => updateParticipantStatus(part.id, st)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                                part.status === st
                                  ? 'bg-zinc-900 text-white'
                                  : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {eventParticipants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-zinc-400">
                        No participants registered yet. Use &quot;Add participant&quot; above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attached Files & Agendas */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-900">Event Agendas & Presentation Links</h4>
            {eventDocs.length > 0 ? (
              <div className="space-y-2">
                {eventDocs.map(doc => {
                  const safeUrl = sanitizeExternalUrl(doc.url);
                  if (!safeUrl) {
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 bg-zinc-50 opacity-75"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-400" />
                          <div>
                            <p className="text-xs font-semibold text-zinc-700">{doc.title}</p>
                            <p className="text-[11px] text-zinc-500">{doc.type} • Insecure URL blocked</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <a
                      key={doc.id}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                        <div>
                          <p className="text-xs font-semibold text-zinc-900">{doc.title}</p>
                          <p className="text-[11px] text-zinc-500">{doc.type}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-800" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No external agendas attached.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
