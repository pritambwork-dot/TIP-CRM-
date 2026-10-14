import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Search,
  Plus,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { NavTab } from './Sidebar';
import { Button, Badge, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui';

interface AppleDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSearch: () => void;
  onOpenQuickAction: () => void;
  onOpenOnboarding: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  isVisible: boolean;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItemConfig[];
}

export const AppleDock: React.FC<AppleDockProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenQuickAction,
  onOpenOnboarding
}) => {
  const { hasPermission, canViewFunding, tasks, aiSuggestions } = useCrm();
  const [isTouch, setIsTouch] = useState(false);

  // Remembers user's collapse preference, default is expanded (true Apple sidebar)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tip_apple_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 1024;
    }
    return false;
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('tip_apple_sidebar_collapsed', String(next));
  };

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Compute overdue tasks count for live badge
  const today = '2026-09-23';
  const overdueTasksCount = tasks.filter(t => t.status !== 'Completed' && t.dueDate < today).length;
  const activeAiSuggestionsCount = (aiSuggestions || []).filter(s => s.status === 'new' || s.status === 'seen').length;

  const sections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          isVisible: true
        }
      ]
    },
    {
      title: 'Relationships',
      items: [
        {
          id: 'people',
          label: 'People & Contacts',
          icon: Users,
          isVisible: hasPermission('people', 'view')
        },
        {
          id: 'organizations',
          label: 'Organizations',
          icon: Building2,
          isVisible: hasPermission('organizations', 'view')
        }
      ]
    },
    {
      title: 'Programs & Impact',
      items: [
        {
          id: 'programs',
          label: 'Programs & Cohorts',
          icon: Compass,
          isVisible: hasPermission('programs', 'view')
        },
        {
          id: 'events',
          label: 'Events & Attendance',
          icon: Calendar,
          isVisible: hasPermission('events', 'view')
        },
        {
          id: 'funding',
          label: 'Donors & Funding',
          icon: HeartHandshake,
          isVisible: canViewFunding
        }
      ]
    },
    {
      title: 'Operations',
      items: [
        {
          id: 'tasks',
          label: 'Tasks & Follow-ups',
          icon: CheckSquare,
          badge: overdueTasksCount > 0 ? overdueTasksCount : undefined,
          isVisible: hasPermission('tasks', 'view')
        },
        {
          id: 'reports',
          label: 'Reports & Export',
          icon: BarChart3,
          isVisible: hasPermission('reports', 'view')
        },
        {
          id: 'intelligence',
          label: 'AI & Suggestions',
          icon: Sparkles,
          badge: activeAiSuggestionsCount > 0 ? activeAiSuggestionsCount : undefined,
          isVisible: hasPermission('intelligence', 'view')
        },
        {
          id: 'documents',
          label: 'Documents & Links',
          icon: FileText,
          isVisible: hasPermission('documents', 'view')
        }
      ]
    },
    {
      title: 'System',
      items: [
        {
          id: 'settings',
          label: 'Organization Settings',
          icon: Settings,
          isVisible: hasPermission('settings', 'view')
        }
      ]
    }
  ];

  return (
    <aside
      className={`
        shrink-0 h-full hidden md:flex flex-col justify-between border-r border-zinc-200/80 bg-[#FBFBFA]/95 backdrop-blur-2xl z-30 select-none
        transition-[width] duration-250 ease-[cubic-bezier(0.25,1,0.5,1)]
        ${isCollapsed ? 'w-[64px] sm:w-[68px]' : 'w-56 sm:w-64'}
      `}
    >
      {/* 1. Apple Sidebar Header */}
      <div className={`p-3 pb-2.5 flex items-center border-b border-zinc-200/70 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <span className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase pl-1">
              Navigation
            </span>
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors apple-tap cursor-pointer shrink-0"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4 text-zinc-600" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors apple-tap cursor-pointer"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-zinc-600" />
          </button>
        )}
      </div>

      {/* 2. Apple Sidebar Navigation Items */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 sm:px-2.5 py-2 space-y-3">
        {sections.map(section => {
          const visibleItems = section.items.filter(item => item.isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-0.5">
              {/* Section Header (macOS style) */}
              {!isCollapsed && (
                <div className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase px-2.5 pt-1 pb-1">
                  {section.title}
                </div>
              )}

              {/* Items in section */}
              {visibleItems.map(item => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                if (isCollapsed) {
                  return (
                    <TooltipProvider key={item.id} delayDuration={80}>
                      <Tooltip>
                        <div className="relative flex justify-center py-0.5">
                          {/* Active indicator dot */}
                          {isActive && (
                            <motion.div
                              layoutId="sidebarActiveDot"
                              className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#140a8e] shadow-2xs"
                              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                            />
                          )}

                          <TooltipTrigger asChild>
                            <motion.button
                              type="button"
                              onClick={() => onTabChange(item.id)}
                              whileTap={{ scale: 0.88 }}
                              className={`
                                w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer apple-tap relative
                                ${
                                  isActive
                                    ? 'bg-[#140a8e] text-white shadow-xs'
                                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                                }
                              `}
                              aria-label={item.label}
                            >
                              <IconComponent className="w-4.5 h-4.5" />
                              {item.badge !== undefined && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ea0543] px-1 text-[9px] font-bold text-white shadow-xs ring-1 ring-white">
                                  {item.badge}
                                </span>
                              )}
                            </motion.button>
                          </TooltipTrigger>

                          <TooltipContent side="right" sideOffset={10} className="flex items-center gap-2">
                            <span>{item.label}</span>
                            {item.badge !== undefined && (
                              <Badge variant="crimson" className="text-[9px] px-1.5 py-0">
                                {item.badge}
                              </Badge>
                            )}
                          </TooltipContent>
                        </div>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex items-center gap-2.5 px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-all apple-tap select-none group relative
                      ${
                        isActive
                          ? 'bg-[#140a8e] text-white font-medium shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                      }
                    `}
                  >
                    <div
                      className={`
                        w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900'}
                      `}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <span className="text-xs truncate flex-1 font-medium leading-tight">
                      {item.label}
                    </span>

                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#ea0543] text-white text-[10px] font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Apple Sidebar Footer & Quick Actions */}
      <div className="p-3 pt-2.5 border-t border-zinc-200/70 shrink-0 space-y-1.5">
        {!isCollapsed ? (
          <>
            {/* Quick Add Button */}
            <Button
              type="button"
              variant="crimson"
              onClick={onOpenQuickAction}
              className="w-full justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
            </Button>

            {/* Quick Search & Guide Dual Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenSearch}
                className="justify-center"
                title="Search records"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenOnboarding}
                className="justify-center"
                title="Workflow guide"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Guide</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <Button
              type="button"
              variant="crimson"
              size="icon"
              onClick={onOpenQuickAction}
              className="w-9 h-9 rounded-xl"
              title="Quick Add"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenSearch}
              className="w-9 h-9 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              title="Search records"
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenOnboarding}
              className="w-9 h-9 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              title="Workflow guide"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};
