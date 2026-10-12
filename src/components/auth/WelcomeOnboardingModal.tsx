import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Shield, 
  ArrowRight, 
  Briefcase, 
  Layers,
  FolderGit2,
  Calendar
} from 'lucide-react';
import { UserProfile, RoleId } from '../../types';
import { ROLE_DEFINITIONS } from '../../lib/permissions';

interface WelcomeOnboardingModalProps {
  user: UserProfile;
  onComplete: () => Promise<void> | void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  user,
  onComplete
}) => {
  const primaryRoleId: RoleId = user.activeRoleId || user.roleId;
  const primaryRoleDef = ROLE_DEFINITIONS[primaryRoleId] || ROLE_DEFINITIONS.staff_member;
  const assignedRoles = user.assignedRoleIds || [primaryRoleId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 text-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400">Account Activated</span>
          </div>

          <h2 id="welcome-modal-title" className="text-2xl font-bold text-white tracking-tight">
            Welcome to TIP CRM, {user.name}!
          </h2>
          <p className="text-sm text-zinc-300 mt-1">
            Your security setup is complete. Here is an overview of your authorized workspace.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Post & Assigned Roles */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Assigned Post & Responsibilities
            </h3>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-zinc-700" />
                  <span className="text-sm font-bold text-zinc-900">{user.postTitle || user.title}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-200 text-zinc-800">
                  {primaryRoleDef.level === 1 ? 'Super Admin' : primaryRoleDef.level === 2 ? 'Manager' : primaryRoleDef.level === 3 ? 'Coordinator' : 'Volunteer'}
                </span>
              </div>

              {user.responsibilities && user.responsibilities.length > 0 && (
                <ul className="text-xs text-zinc-600 space-y-1 pl-6 list-disc">
                  {user.responsibilities.slice(0, 3).map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Assigned Roles & Switching Notice */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-700" />
                <span>Assigned Authority Roles</span>
              </h3>
              <span className="text-[11px] text-zinc-400 font-mono">
                {assignedRoles.length} {assignedRoles.length === 1 ? 'role' : 'roles'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {assignedRoles.map(roleId => {
                const def = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.staff_member;
                const isActive = roleId === primaryRoleId;
                return (
                  <div
                    key={roleId}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span>{def.name}</span>
                    {isActive && <span className="text-[10px] bg-white/20 px-1 rounded">Active</span>}
                  </div>
                );
              })}
            </div>

            {assignedRoles.length > 1 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p>
                  <strong>Multi-Role Account:</strong> You can switch between your assigned roles at any time using the workspace switcher in the top bar. You can only access data and tools granted to your assigned roles.
                </p>
              </div>
            )}
          </div>

          {/* Scopes Overview */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-1.5 text-zinc-500 font-medium mb-1">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Assigned Programs</span>
              </div>
              <p className="font-semibold text-zinc-900">
                {user.assignedProgramIds?.length ? `${user.assignedProgramIds.length} Assigned` : 'All Programs'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-1.5 text-zinc-500 font-medium mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Assigned Events</span>
              </div>
              <p className="font-semibold text-zinc-900">
                {user.assignedEventIds?.length ? `${user.assignedEventIds.length} Assigned` : 'All Events'}
              </p>
            </div>
          </div>

          {/* Confirmation button */}
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <span>Enter TIP CRM Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 text-center text-xs text-zinc-400">
          The Inclusion Project · Operational CRM System
        </div>
      </div>
    </div>
  );
};
