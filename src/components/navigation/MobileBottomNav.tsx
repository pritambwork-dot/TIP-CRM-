import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Sparkles,
  Menu,
  Plus
} from 'lucide-react';
import { NavTab } from '../../types';
import { useCrm } from '../../context/CrmContext';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenDrawer: () => void;
  onOpenQuickAction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenDrawer,
  onOpenQuickAction
}) => {
  const { tasks, aiSuggestions } = useCrm();

  const today = '2026-09-23';
  const overdueTasksCount = tasks.filter(t => t.status !== 'Completed' && t.dueDate < today).length;
  const activeAiSuggestionsCount = (aiSuggestions || []).filter(s => s.status === 'new' || s.status === 'seen').length;

  const isMoreActive = ![
    'dashboard',
    'people',
    'tasks',
    'intelligence'
  ].includes(activeTab);

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#FBFBFA]/92 backdrop-blur-xl border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* 1. Dashboard / Home */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer relative select-none ${
            activeTab === 'dashboard' ? 'text-[#140a8e] font-semibold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
          aria-label="Dashboard"
        >
          <div className="relative">
            <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
            {activeTab === 'dashboard' && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#140a8e]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">Home</span>
        </button>

        {/* 2. People */}
        <button
          type="button"
          onClick={() => onTabChange('people')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer relative select-none ${
            activeTab === 'people' ? 'text-[#140a8e] font-semibold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
          aria-label="People Directory"
        >
          <div className="relative">
            <Users className={`w-5 h-5 transition-transform ${activeTab === 'people' ? 'scale-110' : ''}`} />
            {activeTab === 'people' && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#140a8e]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">People</span>
        </button>

        {/* 3. Center Floating Quick Add Button */}
        <div className="flex items-center justify-center px-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onOpenQuickAction}
            className="w-11 h-11 rounded-full bg-[#ea0543] text-white flex items-center justify-center shadow-md hover:bg-[#d0043b] transition-colors cursor-pointer shrink-0"
            title="Quick Action"
            aria-label="Add new action"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </motion.button>
        </div>

        {/* 4. Tasks */}
        <button
          type="button"
          onClick={() => onTabChange('tasks')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer relative select-none ${
            activeTab === 'tasks' ? 'text-[#140a8e] font-semibold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
          aria-label="Tasks and Follow-ups"
        >
          <div className="relative">
            <CheckSquare className={`w-5 h-5 transition-transform ${activeTab === 'tasks' ? 'scale-110' : ''}`} />
            {overdueTasksCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ea0543] px-1 text-[8px] font-bold text-white shadow-xs">
                {overdueTasksCount}
              </span>
            )}
            {activeTab === 'tasks' && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#140a8e]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">Tasks</span>
        </button>

        {/* 5. More / Full Menu Drawer */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer relative select-none ${
            isMoreActive ? 'text-[#140a8e] font-semibold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
          aria-label="All CRM Sections and Menu"
        >
          <div className="relative">
            <Menu className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 text-[#140a8e]' : ''}`} />
            {activeAiSuggestionsCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#140a8e] px-1 text-[8px] font-bold text-white shadow-xs">
                {activeAiSuggestionsCount}
              </span>
            )}
            {isMoreActive && (
              <motion.div
                layoutId="mobileBottomIndicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#140a8e]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};
