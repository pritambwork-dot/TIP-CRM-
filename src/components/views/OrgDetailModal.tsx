import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  MapPin, 
  Users, 
  Compass, 
  MessageSquare, 
  Plus, 
  FileText, 
  ExternalLink,
  Edit3,
  Check,
  Trash2,
  Lock
} from 'lucide-react';
import { Organization } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { sanitizeExternalUrl } from '../../lib/safeUrls';

interface OrgDetailModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
}

export const OrgDetailModal: React.FC<OrgDetailModalProps> = ({
  orgId,
  isOpen,
  onClose,
  onSelectPerson
}) => {
  const { 
    organizations, 
    updateOrganization, 
    deleteOrganization,
    people, 
    programs, 
    interactions, 
    documents,
    currentUser,
    hasPermission,
    Permissions
  } = useCrm();

  const [activeTab, setActiveTab] = useState<'contacts' | 'programs' | 'timeline' | 'documents'>('contacts');
  const [isEditing, setIsEditing] = useState(false);

  const org = organizations.find(o => o.id === orgId);

  const canEditOrg = hasPermission('organizations', 'edit');
  const canDeleteOrg = hasPermission('organizations', 'delete');

  const [editName, setEditName] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!isOpen || !org) return null;

  const handleStartEdit = () => {
    setEditName(org.name);
    setEditSector(org.sector);
    setEditWebsite(org.website);
    setEditNotes(org.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateOrganization(org.id, {
      name: editName,
      sector: editSector,
      website: editWebsite,
      notes: editNotes
    });
    setIsEditing(false);
  };

  // Automatically connected people!
  const connectedPeople = people.filter(p => 
    p.organizationId === org.id || 
    (p.organizationName && p.organizationName.toLowerCase().includes(org.name.toLowerCase()))
  );

  const connectedPrograms = programs.filter(pr => 
    org.programsInvolved.includes(pr.id) || pr.partnerIds.includes(org.id)
  );

  const connectedInteractions = interactions.filter(i => 
    i.organizationId === org.id || 
    (i.organizationName && i.organizationName.toLowerCase().includes(org.name.toLowerCase()))
  );

  const connectedDocs = documents.filter(d => 
    d.relatedType === 'Organization' && d.relatedId === org.id
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-end sm:items-stretch justify-end"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white h-[92vh] sm:h-full rounded-t-3xl sm:rounded-none sm:rounded-l-2xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* iOS Drag Handle Bar (Mobile only) */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-[#FAF9F8]">
          <div className="w-10 h-1 bg-zinc-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-200 bg-[#FAF9F8] flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {org.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input 
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-lg font-bold text-zinc-900 border border-zinc-300 rounded px-2 py-1 w-full"
                  />
                  <input 
                    type="text"
                    value={editSector}
                    onChange={e => setEditSector(e.target.value)}
                    className="text-xs border border-zinc-300 rounded px-2 py-1 w-full"
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{org.name}</h3>
                  <p className="text-xs text-zinc-600 font-medium mt-0.5">{org.sector} • {org.type}</p>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
                {org.website && sanitizeExternalUrl(org.website) && (
                  <a 
                    href={sanitizeExternalUrl(org.website)!} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-zinc-900 text-zinc-700 underline underline-offset-2"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{org.city ? `${org.city}, ${org.province || 'Canada'}` : 'Canada'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <button 
                onClick={handleSaveEdit} 
                title="Save changes"
                className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
              >
                <Check className="w-5 h-5" />
              </button>
            ) : (
              <ProtectedAction resource="organizations" action="edit" mode="disable" showLockIcon={false}>
                <button 
                  onClick={handleStartEdit} 
                  id="btn-edit-org"
                  title="Edit organization profile"
                  className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </ProtectedAction>
            )}

            <ProtectedAction resource="organizations" action="delete" mode="disable" showLockIcon={false}>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete the organization "${org.name}"?`)) {
                    deleteOrganization(org.id);
                    onClose();
                  }
                }}
                id="btn-delete-org"
                title="Super Admin: Delete Organization"
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

        {/* Tab navigation */}
        <div className="flex items-center px-6 border-b border-zinc-200 bg-[#FDFDFD] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'contacts' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500'
            }`}
          >
            Connected People ({connectedPeople.length})
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'programs' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500'
            }`}
          >
            Programs Involved ({connectedPrograms.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'timeline' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500'
            }`}
          >
            Touchpoints ({connectedInteractions.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'documents' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500'
            }`}
          >
            Documents & Grants
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Connected People */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900">Staff, Liaisons & Participants</h4>
                  <p className="text-xs text-zinc-500">Automatically linked to this organization in TIP's directory</p>
                </div>
              </div>

              {connectedPeople.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No contacts linked yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedPeople.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onSelectPerson(p.id)}
                      className="p-3.5 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-800 font-semibold text-xs flex items-center justify-center">
                          {p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-zinc-900">{p.name}</p>
                          <p className="text-[11px] text-zinc-500">{p.role || 'Member'} • {p.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
                          {p.relationshipTypes[0]}
                        </span>
                        <span className="text-zinc-400 text-xs">&rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Organization Notes */}
              <div className="mt-6 pt-4 border-t border-zinc-200">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Relationship Background</h4>
                <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 leading-relaxed">
                  {org.notes || 'No background notes recorded.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Programs */}
          {activeTab === 'programs' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-900">Programs & Strategic Initiatives</h4>
              {connectedPrograms.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4">No active programs associated with this partner.</p>
              ) : (
                connectedPrograms.map(pr => (
                  <div key={pr.id} className="p-4 rounded-lg border border-zinc-200 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-900">{pr.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">{pr.status}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{pr.description}</p>
                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Timeline: {pr.startDate} to {pr.endDate}</span>
                      <span className="font-semibold text-zinc-700">{pr.progressPercent}% milestone</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Touchpoints */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-900">Communication History</h4>
              {connectedInteractions.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4">No interactions logged for this organization yet.</p>
              ) : (
                connectedInteractions.map(int => (
                  <div key={int.id} className="p-3.5 rounded-lg border border-zinc-200 bg-white text-xs">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span className="font-semibold text-zinc-800">{int.type}: {int.summary}</span>
                      <span>{int.date}</span>
                    </div>
                    {int.details && <p className="text-zinc-600 mt-1 leading-relaxed">{int.details}</p>}
                    <p className="text-[11px] text-zinc-400 mt-2">Logged by {int.authorName}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-900">Partner Documents & Agreements</h4>
              {connectedDocs.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4">No files or Google Drive links attached to this organization.</p>
              ) : (
                connectedDocs.map(doc => {
                  const safeUrl = sanitizeExternalUrl(doc.url);
                  if (!safeUrl) {
                    return (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs opacity-75"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-zinc-400" />
                          <div>
                            <p className="font-semibold text-zinc-700">{doc.title}</p>
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
                      className="p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="font-semibold text-zinc-900">{doc.title}</p>
                          <p className="text-[11px] text-zinc-400">{doc.type}</p>
                        </div>
                      </div>
                      <span className="text-zinc-400 group-hover:text-zinc-800">Open &rarr;</span>
                    </a>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
