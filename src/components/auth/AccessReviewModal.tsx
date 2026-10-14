import React, { useState } from 'react';
import { X, Shield, Check, AlertTriangle, ArrowRight, UserCheck, Lock } from 'lucide-react';
import { AccessRequest, RoleId, Program, EventItem } from '../../types';
import { ROLE_DEFINITIONS } from '../../lib/permissions';

interface AccessReviewModalProps {
  request: AccessRequest;
  programs: Program[];
  events: EventItem[];
  isOpen: boolean;
  onClose: () => void;
  onApprove: (
    requestId: string,
    roleId: RoleId,
    dataScope: 'GLOBAL' | 'ORGANIZATION' | 'ASSIGNED' | 'OWN_RECORD',
    programIds: string[],
    eventIds: string[]
  ) => void;
  onReject: (requestId: string, reason: string) => void;
}

export const AccessReviewModal: React.FC<AccessReviewModalProps> = ({
  request,
  programs,
  events,
  isOpen,
  onClose,
  onApprove,
  onReject
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleId>('staff_member');
  const [selectedScope, setSelectedScope] = useState<'GLOBAL' | 'ORGANIZATION' | 'ASSIGNED' | 'OWN_RECORD'>('ASSIGNED');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(
    programs.slice(0, 2).map(p => p.id)
  );
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    events.slice(0, 1).map(e => e.id)
  );
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen) return null;

  const roleDef = ROLE_DEFINITIONS[selectedRole];

  const handleRoleChange = (newRole: RoleId) => {
    setSelectedRole(newRole);
    if (newRole === 'super_admin') {
      setSelectedScope('GLOBAL');
    } else if (newRole === 'staff_manager') {
      setSelectedScope('GLOBAL');
    } else {
      setSelectedScope('ASSIGNED');
    }
  };

  const handleProgramToggle = (id: string) => {
    if (selectedPrograms.includes(id)) {
      setSelectedPrograms(selectedPrograms.filter(pId => pId !== id));
    } else {
      setSelectedPrograms([...selectedPrograms, id]);
    }
  };

  const handleEventToggle = (id: string) => {
    if (selectedEvents.includes(id)) {
      setSelectedEvents(selectedEvents.filter(eId => eId !== id));
    } else {
      setSelectedEvents([...selectedEvents, id]);
    }
  };

  const executeApproval = () => {
    onApprove(
      request.id,
      selectedRole,
      selectedScope,
      selectedPrograms,
      selectedEvents
    );
    onClose();
  };

  const executeRejection = () => {
    onReject(request.id, rejectionReason.trim() || 'Access not approved by administrator.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs antialiased">
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              Security Gate Review
            </span>
            <h2 className="text-lg font-serif font-semibold text-zinc-900">
              Review Access Request
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-700 text-left">
          {/* User Request Summary */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 text-base">{request.fullName}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-200/80 text-zinc-800">
                Provider: {request.provider.toUpperCase()}
              </span>
            </div>
            <div className="font-mono text-xs text-zinc-600">{request.email}</div>
            <div className="text-xs text-zinc-500">
              Requested: {new Date(request.requestedAt).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
            </div>
            {request.notes && (
              <div className="pt-2 mt-2 border-t border-zinc-200 text-xs text-zinc-600">
                <span className="font-medium text-zinc-700">Applicant Note:</span> {request.notes}
              </div>
            )}
          </div>

          {rejecting ? (
            /* Rejection Sub-form */
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Specify Reason for Denying Access</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                The applicant will see this reason on their access screen when they next sign in.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Not an active team member or volunteer for the current program cycle."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-zinc-800"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Back to Review
                </button>
                <button
                  type="button"
                  onClick={executeRejection}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Confirm Denial
                </button>
              </div>
            </div>
          ) : (
            /* Approval Configuration */
            <>
              {/* 1. Role Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 uppercase tracking-wider mb-2">
                  Assign System Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['staff_member', 'staff_manager', 'volunteer', 'super_admin'] as RoleId[]).map((roleId) => {
                    const def = ROLE_DEFINITIONS[roleId];
                    const isSelected = selectedRole === roleId;
                    return (
                      <button
                        key={roleId}
                        type="button"
                        onClick={() => handleRoleChange(roleId)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs">{def.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            L{def.level}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-tight line-clamp-2 ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}>
                          {def.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Data Scope Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 uppercase tracking-wider mb-2">
                  Data Scope (Section 19)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'GLOBAL', label: 'GLOBAL', desc: 'All organizational records (Admins/Managers)' },
                    { id: 'ORGANIZATION', label: 'ORGANIZATION', desc: 'TIP Organization scope' },
                    { id: 'ASSIGNED', label: 'ASSIGNED', desc: 'Only assigned programs & events (Default)' },
                    { id: 'OWN_RECORD', label: 'OWN_RECORD', desc: 'Strictly self-created records' }
                  ].map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => setSelectedScope(scope.id as any)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        selectedScope === scope.id
                          ? 'border-zinc-900 bg-zinc-50 font-medium text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <div className="font-mono font-semibold text-zinc-900">{scope.label}</div>
                      <div className="text-[10px] text-zinc-500">{scope.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Program Assignment Multi-select */}
              {selectedScope === 'ASSIGNED' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-700 uppercase tracking-wider">
                      Assign Programs
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      {selectedPrograms.length} selected
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border border-zinc-200 bg-zinc-50/60">
                    {programs.map((p) => {
                      const checked = selectedPrograms.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200 text-xs cursor-pointer hover:bg-zinc-50"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleProgramToggle(p.id)}
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <span className="font-medium text-zinc-800">{p.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">{p.status}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Event Assignment Multi-select */}
              {selectedScope === 'ASSIGNED' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-700 uppercase tracking-wider">
                      Assign Events
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      {selectedEvents.length} selected
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border border-zinc-200 bg-zinc-50/60">
                    {events.map((e) => {
                      const checked = selectedEvents.includes(e.id);
                      return (
                        <label
                          key={e.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200 text-xs cursor-pointer hover:bg-zinc-50"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleEventToggle(e.id)}
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <span className="font-medium text-zinc-800">{e.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">{e.date}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Permissions Preview (Inherited from selected role) */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="text-xs font-medium text-zinc-700 mb-1.5">
                  Inherited Permissions ({roleDef.name})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(roleDef.defaultPermissions)
                    .filter(([_, allowed]) => allowed)
                    .slice(0, 8)
                    .map(([perm]) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200"
                      >
                        {perm}
                      </span>
                    ))}
                  {Object.values(roleDef.defaultPermissions).filter(Boolean).length > 8 && (
                    <span className="text-[10px] text-zinc-400 px-1 py-0.5">
                      +{Object.values(roleDef.defaultPermissions).filter(Boolean).length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        {!rejecting && (
          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            >
              Reject Request
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeApproval}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Approve & Activate Access</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
