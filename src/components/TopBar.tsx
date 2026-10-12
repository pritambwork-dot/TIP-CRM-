import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  X,
  Shield,
  ChevronDown,
  LogOut,
  Sparkles,
  Check,
  Layers,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { TipLogo } from './TipLogo';
import { Button, Badge } from './ui';
import { RoleId, NavTab } from '../types';
import { ROLE_DEFINITIONS } from '../lib/permissions';

interface TopBarProps {
  currentSectionTitle: string;
  onOpenSearch: () => void;
  onOpenQuickAction: () => void;
  onOpenImport: () => void;
  onSelectTask: (taskId: string) => void;
  onNavigate?: (tab: NavTab) => void;
  onOpenMobileDrawer?: () => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentSectionTitle,
  onOpenSearch,
  onOpenQuickAction,
  onOpenImport,
  onSelectTask,
  onNavigate,
  onOpenMobileDrawer,
  onLogout
}) => {
  const { 
    tasks, 
    events, 
    currentUser, 
    switchActiveRole,
    roleDefinition,
    hasPermission,
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    aiSuggestions
  } = useCrm();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [roleToast, setRoleToast] = useState<string | null>(null);

  const handleSwitchRole = async (targetRole: RoleId) => {
    if (targetRole === (currentUser.activeRoleId || currentUser.roleId)) {
      setShowRoleSwitcher(false);
      return;
    }
    const success = await switchActiveRole(targetRole);
    setShowRoleSwitcher(false);
    if (success) {
      const targetDef = ROLE_DEFINITIONS[targetRole] || ROLE_DEFINITIONS.staff_member;
      setRoleToast(`Switched active workspace to ${targetDef.name}`);
      setTimeout(() => setRoleToast(null), 3500);
    }
  };

  // Compute urgent notifications (overdue tasks or events happening in next 7 days)
  const today = '2026-09-23';
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.dueDate < today);
  const upcomingEvents = events.filter(e => e.date >= today).slice(0, 3);
  const unreadCount = overdueTasks.length + (upcomingEvents.length > 0 ? 1 : 0);
  const activeAiSuggestionsCount = (aiSuggestions || []).filter(s => s.status === 'new' || s.status === 'seen').length;

  return (
    <header className="h-14 sm:h-16 bg-[#FBFBFA]/85 backdrop-blur-xl border-b border-zinc-200/70 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all select-none">
      {/* Left Section: TIP Brand + Page Title */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile Menu Drawer Trigger */}
        {onOpenMobileDrawer && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="md:hidden w-8 h-8 rounded-lg bg-zinc-100/90 hover:bg-zinc-200/80 flex items-center justify-center text-zinc-700 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Organization Brand */}
        <div className="flex items-center shrink-0">
          <div className="hidden sm:block">
            <TipLogo variant="full" className="h-7.5 md:h-8.5 w-auto" />
          </div>
          <div className="block sm:hidden">
            <TipLogo variant="emblem" className="h-7 w-auto" />
          </div>
        </div>

        {/* Subtle Divider */}
        <div className="h-4.5 w-px bg-zinc-200/90 mx-0.5 hidden sm:block shrink-0" />

        {/* Section Title & Scope Breadcrumb */}
        <div className="min-w-0 pl-0.5">
          <h1 className="text-sm sm:text-base font-semibold text-zinc-900 truncate tracking-tight font-serif">
            {currentSectionTitle}
          </h1>
          <p className="hidden sm:block text-[11px] text-zinc-500 font-medium truncate">
            {currentUser?.dataScope?.people === 'GLOBAL' ? 'Global Scope' : 'Assigned Scope'} • {currentUser.name}
          </p>
        </div>
      </div>

      {/* Right Section: Spotlight Search, Import, Add New, Notifications, User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Spotlight Global Search Bar */}
        <button
          type="button"
          onClick={onOpenSearch}
          id="btn-global-search"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100/90 hover:bg-zinc-200/80 border border-zinc-200/90 text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer shadow-2xs group w-36 sm:w-52 md:w-64 lg:w-72"
          title="Search TIP records across people, programs, grants, events, tasks (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 shrink-0" />
          <span className="text-xs text-zinc-500 group-hover:text-zinc-800 truncate flex-1 text-left font-normal">
            Search records...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-white border border-zinc-200 rounded-md shadow-2xs group-hover:text-zinc-600 shrink-0">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>

        {/* TIP Intelligence Companion Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
          id="btn-tip-intelligence-trigger"
          className="flex items-center gap-1.5 bg-[#140a8e]/5 hover:bg-[#140a8e]/10 border-[#140a8e]/25 text-[#140a8e] font-semibold transition-all shadow-2xs"
          title="Open TIP Intelligence Work Companion"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#140a8e]" />
          <span className="hidden sm:inline">TIP Intelligence</span>
          {activeAiSuggestionsCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#140a8e] text-white">
              {activeAiSuggestionsCount}
            </span>
          )}
        </Button>

        {/* Ask Data AI Assistant Button (Section 26) */}
        {onNavigate && hasPermission('intelligence', 'view') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('intelligence')}
            className="hidden md:flex gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 border-zinc-200 text-zinc-700 font-medium"
            title="Ask your data with AI intelligence"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ea0543]" />
            <span className="hidden lg:inline">Ask Data</span>
          </Button>
        )}

        {/* Import CSV / Spreadsheets */}
        {hasPermission('people', 'import') && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            id="btn-topbar-import"
            className="hidden md:flex gap-1.5"
            title="Import contacts from CSV or Excel"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500" />
            <span>Import</span>
          </Button>
        )}

        {/* Quick Add Button */}
        <Button
          variant="crimson"
          size="sm"
          onClick={onOpenQuickAction}
          id="btn-quick-action"
          className="gap-1.5"
          title="Quick add person, event, task, or interaction"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </Button>

        {/* Notifications Bell with macOS/iOS Flyout */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 sm:p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 relative cursor-pointer apple-tap"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ea0543] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Flyout with Spring Animation */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="absolute right-[-40px] sm:right-0 mt-2 w-[calc(100vw-24px)] sm:w-88 max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl border border-zinc-200/90 shadow-2xl py-3 z-50 overflow-hidden"
              >
                <div className="px-4 pb-2 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Notifications</h4>
                    <p className="text-[11px] text-zinc-500">Restrained, actionable alerts only</p>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-zinc-400 hover:text-zinc-700 p-1 apple-tap rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto px-2 py-1 divide-y divide-zinc-50">
                  {overdueTasks.length > 0 && (
                    <div className="py-2 px-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Overdue Follow-up ({overdueTasks.length})</span>
                      </div>
                      {overdueTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={() => {
                            onSelectTask(task.id);
                            setShowNotifications(false);
                          }}
                          className="p-2 rounded-xl hover:bg-zinc-50 cursor-pointer text-xs apple-tap"
                        >
                          <p className="font-medium text-zinc-800 line-clamp-1">{task.title}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Due {task.dueDate} • {task.owner}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {upcomingEvents.length > 0 && (
                    <div className="py-2 px-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Upcoming Events</span>
                      </div>
                      {upcomingEvents.map(evt => (
                        <div key={evt.id} className="p-2 rounded-xl hover:bg-zinc-50 text-xs apple-tap">
                          <p className="font-medium text-zinc-800 line-clamp-1">{evt.name}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{evt.date} • {evt.location}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {unreadCount === 0 && (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      All operational follow-ups are up to date.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Multi-Role Switcher Pill (only rendered if user has > 1 assigned role) */}
        {currentUser.assignedRoleIds && currentUser.assignedRoleIds.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200/90 text-zinc-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Switch between your assigned authority roles"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline truncate max-w-[130px]">
                {roleDefinition.name}
              </span>
              <span className="md:hidden">
                Role
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            <AnimatePresence>
              {showRoleSwitcher && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="absolute right-[-20px] sm:right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-64 max-w-xs bg-white rounded-2xl border border-zinc-200 shadow-xl p-2 z-50 text-xs space-y-1"
                >
                  <div className="px-3 py-2 border-b border-zinc-100">
                    <p className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider">Switch Active Role</p>
                    <p className="text-[11px] text-zinc-500">Switch workspace authority and tool visibility</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    {currentUser.assignedRoleIds.map(roleId => {
                      const def = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.staff_member;
                      const isSelected = roleId === (currentUser.activeRoleId || currentUser.roleId);
                      return (
                        <button
                          key={roleId}
                          type="button"
                          onClick={() => handleSwitchRole(roleId)}
                          className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isSelected ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold' : 'hover:bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-zinc-300'}`} />
                            <div className="min-w-0">
                              <p className="text-xs truncate font-medium">{def.name}</p>
                              <p className="text-[10px] text-zinc-500">Level {def.level} Authority</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* User Profile Pill & Account Menu */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowUserSwitcher(!showUserSwitcher)}
            className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-200/80 hover:bg-zinc-100/70 p-1 rounded-xl transition-all cursor-pointer"
            title="User Account Profile & Settings"
          >
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
            >
              {currentUser.avatarInitials}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left mr-0.5">
              <span className="text-[11px] font-semibold text-zinc-800 leading-tight truncate max-w-[110px]">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-zinc-500 font-medium leading-tight truncate max-w-[110px]">
                {currentUser.postTitle || currentUser.title || 'Staff'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* User Account Dropdown */}
          <AnimatePresence>
            {showUserSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-72 max-w-xs bg-white rounded-2xl border border-zinc-200 shadow-xl p-3 z-50 text-xs space-y-2.5"
              >
                {/* Profile Card Header */}
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100">
                  <div className="w-9 h-9 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 text-xs truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{currentUser.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 truncate">
                        {roleDefinition.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="px-1 py-0.5 space-y-1 text-zinc-600 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Primary Post:</span>
                    <span className="font-medium text-zinc-800 truncate max-w-[140px] text-right">
                      {currentUser.postTitle || currentUser.title || 'General Staff'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Account Status:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active & Verified
                    </span>
                  </div>
                </div>

                {/* My Assigned Roles section if multi-role */}
                {currentUser.assignedRoleIds && currentUser.assignedRoleIds.length > 1 && (
                  <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                      My Assigned Roles ({currentUser.assignedRoleIds.length})
                    </p>
                    <div className="space-y-1">
                      {currentUser.assignedRoleIds.map(rId => {
                        const def = ROLE_DEFINITIONS[rId] || ROLE_DEFINITIONS.staff_member;
                        const isCurrent = rId === (currentUser.activeRoleId || currentUser.roleId);
                        return (
                          <button
                            key={rId}
                            type="button"
                            onClick={() => {
                              handleSwitchRole(rId);
                              setShowUserSwitcher(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isCurrent ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-zinc-200/60 text-zinc-700'
                            }`}
                          >
                            <span>{def.name}</span>
                            {isCurrent && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {onLogout && (
                  <div className="pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserSwitcher(false);
                        onLogout();
                      }}
                      className="w-full text-left p-1.5 rounded-xl flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Role Transition Toast Notification */}
      <AnimatePresence>
        {roleToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-zinc-700 flex items-center gap-2 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{roleToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
