import React from 'react';
import { 
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
  ShieldCheck, 
  UserCheck, 
  LogOut,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export type NavTab = 
  | 'dashboard' 
  | 'people' 
  | 'organizations' 
  | 'programs' 
  | 'events' 
  | 'tasks' 
  | 'funding' 
  | 'reports' 
  | 'documents' 
  | 'intelligence'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenOnboarding: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenOnboarding,
  isOpenMobile,
  onCloseMobile
}) => {
  const { 
    currentUser, 
    roleBadge,
    hasPermission, 
    canViewFunding, 
    isVolunteer,
    isSuperAdmin
  } = useCrm();

  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType; isVisible: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isVisible: true },
    { id: 'people', label: 'People', icon: Users, isVisible: hasPermission('people', 'view') },
    { id: 'organizations', label: 'Organizations', icon: Building2, isVisible: hasPermission('organizations', 'view') },
    { id: 'programs', label: 'Programs', icon: Compass, isVisible: hasPermission('programs', 'view') },
    { id: 'events', label: 'Events', icon: Calendar, isVisible: hasPermission('events', 'view') },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, isVisible: hasPermission('tasks', 'view') },
    { id: 'funding', label: 'Donors & Funding', icon: HeartHandshake, isVisible: canViewFunding },
    { id: 'reports', label: 'Reports', icon: BarChart3, isVisible: hasPermission('reports', 'view') },
    { id: 'intelligence', label: 'AI Intelligence', icon: Sparkles, isVisible: hasPermission('intelligence', 'view') },
    { id: 'documents', label: 'Documents', icon: FileText, isVisible: hasPermission('documents', 'view') },
    { id: 'settings', label: 'Settings', icon: Settings, isVisible: hasPermission('settings', 'view') || isSuperAdmin }
  ];

  const handleSelect = (tab: NavTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#F7F7F6] border-r border-zinc-200/80 
          flex flex-col justify-between transition-transform duration-200 ease-in-out
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Organization Brand Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-xs tracking-wider">
              TIP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-900 text-[15px] tracking-tight">The Inclusion Project</span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Canadian Nonprofit CRM</p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.filter(item => item.isVisible).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left cursor-pointer
                  ${isActive 
                    ? 'bg-zinc-900 text-white shadow-xs font-semibold' 
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span className="flex-1">{item.label}</span>
                {item.id === 'tasks' && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-600'}`}>
                    Active
                  </span>
                )}
                {item.id === 'settings' && currentUser.roleId === 'super_admin' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-semibold">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Section & User Info */}
        <div className="p-3 border-t border-zinc-200/80 bg-[#F4F4F3]/50 space-y-2">
          {/* Quick Guide Trigger */}
          <button
            onClick={onOpenOnboarding}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span>TIP Workflow Guide</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-900 truncate leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-zinc-500 truncate leading-tight">
                  {currentUser.postTitle || currentUser.title || 'Staff'}
                </p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/60 shrink-0">
              {roleBadge.label}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
