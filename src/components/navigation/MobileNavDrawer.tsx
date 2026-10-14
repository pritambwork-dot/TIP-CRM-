import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  LayoutDashboard, 
  Users, 
  Building2, 
  Compass, 
  Calendar, 
  CheckSquare, 
  HeartHandshake, 
  BarChart3, 
  FileText, 
  Settings, 
  Sparkles,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';
import { NavTab } from '../Sidebar';
import { useCrm } from '../../context/CrmContext';
import { TipLogo } from '../TipLogo';
import { ROLE_DEFINITIONS } from '../../lib/permissions';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenOnboarding: () => void;
  onLogout?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  onOpenOnboarding,
  onLogout
}) => {
  const { 
    currentUser, 
    roleDefinition, 
    switchActiveRole, 
    hasPermission, 
    canViewFunding,
    tasks,
    aiSuggestions
  } = useCrm();

  const today = '2026-09-23';
  const overdueTasksCount = tasks.filter(t => t.status !== 'Completed' && t.dueDate < today).length;
  const activeAiSuggestionsCount = (aiSuggestions || []).filter(s => s.status === 'new' || s.status === 'seen').length;

  const sections = [
    {
      group: 'Core Workspaces',
      items: [
        { id: 'dashboard' as NavTab, label: 'Operational Dashboard', short: 'Dashboard', icon: LayoutDashboard, isVisible: true },
        { id: 'people' as NavTab, label: 'People & Relationships', short: 'People', icon: Users, isVisible: hasPermission('people', 'view') },
        { id: 'organizations' as NavTab, label: 'Partner Organizations', short: 'Organizations', icon: Building2, isVisible: hasPermission('organizations', 'view') },
      ]
    },
    {
      group: 'Community Impact',
      items: [
        { id: 'programs' as NavTab, label: 'Programs & Cohorts', short: 'Programs', icon: Compass, isVisible: hasPermission('programs', 'view') },
        { id: 'events' as NavTab, label: 'Events & Attendance', short: 'Events', icon: Calendar, isVisible: hasPermission('events', 'view') },
        { id: 'documents' as NavTab, label: 'Documents & Artifacts', short: 'Documents', icon: FileText, isVisible: hasPermission('documents', 'view') },
      ]
    },
    {
      group: 'Operations & Stewardship',
      items: [
        { id: 'tasks' as NavTab, label: 'Tasks & Follow-ups', short: 'Tasks', icon: CheckSquare, isVisible: hasPermission('tasks', 'view'), badge: overdueTasksCount },
        { id: 'funding' as NavTab, label: 'Donors & Funding Grants', short: 'Funding', icon: HeartHandshake, isVisible: canViewFunding },
        { id: 'reports' as NavTab, label: 'Board & Funder Reports', short: 'Reports', icon: BarChart3, isVisible: hasPermission('reports', 'view') },
      ]
    },
    {
      group: 'Intelligence & Controls',
      items: [
        { id: 'intelligence' as NavTab, label: 'TIP Proactive AI & Analytics', short: 'AI Intelligence', icon: Sparkles, isVisible: hasPermission('intelligence', 'view'), badge: activeAiSuggestionsCount },
        { id: 'settings' as NavTab, label: 'Organization & User Settings', short: 'Settings', icon: Settings, isVisible: hasPermission('settings', 'view') },
      ]
    }
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-[86vw] max-w-[340px] bg-[#FBFBFA] h-full flex flex-col shadow-2xl z-10 overflow-hidden"
          >
            {/* Header: Brand & Close Button */}
            <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
              <TipLogo variant="full" className="h-8 w-auto" />
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 cursor-pointer active:scale-95 transition-all"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-4 bg-zinc-50 border-b border-zinc-200/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {currentUser.avatarInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900 text-xs truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5">{currentUser.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 truncate">
                      {roleDefinition.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-role Switcher if user has assigned multiple roles */}
              {currentUser.assignedRoleIds && currentUser.assignedRoleIds.length > 1 && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-200/60">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                    Assigned Workspace Role
                  </span>
                  <select
                    value={currentUser.activeRoleId || currentUser.roleId}
                    onChange={(e) => switchActiveRole(e.target.value as any)}
                    className="w-full text-xs bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 font-medium text-zinc-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    {currentUser.assignedRoleIds.map(rId => {
                      const def = ROLE_DEFINITIONS[rId] || ROLE_DEFINITIONS.staff_member;
                      return (
                        <option key={rId} value={rId}>
                          {def.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {sections.map(sec => {
                const visible = sec.items.filter(i => i.isVisible);
                if (visible.length === 0) return null;

                return (
                  <div key={sec.group} className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2">
                      {sec.group}
                    </p>
                    <div className="space-y-0.5">
                      {visible.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer ${
                              isActive 
                                ? 'bg-[#140a8e] text-white font-semibold shadow-xs' 
                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                              <span className="text-xs truncate">{item.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[9px] font-bold ${
                                  isActive ? 'bg-white text-[#140a8e]' : 'bg-[#ea0543] text-white'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer: Workflow Guide & Sign Out */}
            <div className="p-3 bg-white border-t border-zinc-200/80 space-y-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOnboarding();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-zinc-500" />
                <span>TIP Workflow Guide</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
