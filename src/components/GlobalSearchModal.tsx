import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Users, 
  Building2, 
  Compass, 
  Calendar, 
  CheckSquare, 
  FileText, 
  X,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { NavTab } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab, recordId?: string) => void;
}

type SearchCategory = 'all' | 'person' | 'organization' | 'program' | 'event' | 'task' | 'document';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { people, organizations, programs, events, tasks, documents } = useCrm();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedCategory('all');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global hotkey listeners for functional navigation without showing badges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const trimmed = query.trim().toLowerCase();

  // Search across all models
  const allResults = useMemo(() => {
    const res: Array<{
      id: string;
      type: 'person' | 'organization' | 'program' | 'event' | 'task' | 'document';
      title: string;
      subtitle: string;
      tag: string;
      tab: NavTab;
      icon: React.ElementType;
      colorTheme: {
        bg: string;
        text: string;
        border: string;
        badgeBg: string;
      };
    }> = [];

    if (trimmed.length > 0) {
      // People
      people.forEach(p => {
        if (
          p.name.toLowerCase().includes(trimmed) ||
          p.email.toLowerCase().includes(trimmed) ||
          p.organizationName?.toLowerCase().includes(trimmed) ||
          p.role?.toLowerCase().includes(trimmed) ||
          p.interests.some(i => i.toLowerCase().includes(trimmed))
        ) {
          res.push({
            id: p.id,
            type: 'person',
            title: p.name,
            subtitle: `${p.role || 'Contact'} ${p.organizationName ? `• ${p.organizationName}` : ''}`,
            tag: p.relationshipTypes[0] || 'Person',
            tab: 'people',
            icon: Users,
            colorTheme: {
              bg: 'bg-blue-50',
              text: 'text-blue-700',
              border: 'border-blue-100',
              badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60'
            }
          });
        }
      });

      // Organizations
      organizations.forEach(o => {
        if (
          o.name.toLowerCase().includes(trimmed) ||
          o.sector.toLowerCase().includes(trimmed) ||
          o.type.toLowerCase().includes(trimmed)
        ) {
          res.push({
            id: o.id,
            type: 'organization',
            title: o.name,
            subtitle: `${o.sector} • ${o.city || 'Canada'}`,
            tag: o.type,
            tab: 'organizations',
            icon: Building2,
            colorTheme: {
              bg: 'bg-purple-50',
              text: 'text-purple-700',
              border: 'border-purple-100',
              badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/60'
            }
          });
        }
      });

      // Programs
      programs.forEach(pr => {
        if (
          pr.name.toLowerCase().includes(trimmed) ||
          pr.description.toLowerCase().includes(trimmed) ||
          pr.focusAreas.some(f => f.toLowerCase().includes(trimmed))
        ) {
          res.push({
            id: pr.id,
            type: 'program',
            title: pr.name,
            subtitle: `Status: ${pr.status} • Lead: ${pr.ownerName}`,
            tag: 'Program',
            tab: 'programs',
            icon: Compass,
            colorTheme: {
              bg: 'bg-amber-50',
              text: 'text-amber-700',
              border: 'border-amber-100',
              badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/60'
            }
          });
        }
      });

      // Events
      events.forEach(ev => {
        if (
          ev.name.toLowerCase().includes(trimmed) ||
          ev.location.toLowerCase().includes(trimmed) ||
          ev.facilitator.toLowerCase().includes(trimmed)
        ) {
          res.push({
            id: ev.id,
            type: 'event',
            title: ev.name,
            subtitle: `${ev.date} • Facilitated by ${ev.facilitator}`,
            tag: ev.type,
            tab: 'events',
            icon: Calendar,
            colorTheme: {
              bg: 'bg-rose-50',
              text: 'text-rose-700',
              border: 'border-rose-100',
              badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/60'
            }
          });
        }
      });

      // Tasks
      tasks.forEach(t => {
        if (
          t.title.toLowerCase().includes(trimmed) ||
          t.owner.toLowerCase().includes(trimmed) ||
          t.notes?.toLowerCase().includes(trimmed)
        ) {
          res.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: `Due: ${t.dueDate} • Assigned to ${t.owner}`,
            tag: t.status,
            tab: 'tasks',
            icon: CheckSquare,
            colorTheme: {
              bg: 'bg-emerald-50',
              text: 'text-emerald-700',
              border: 'border-emerald-100',
              badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
            }
          });
        }
      });

      // Documents
      documents.forEach(d => {
        if (
          d.title.toLowerCase().includes(trimmed) ||
          d.type.toLowerCase().includes(trimmed) ||
          d.relatedName?.toLowerCase().includes(trimmed)
        ) {
          res.push({
            id: d.id,
            type: 'document',
            title: d.title,
            subtitle: `${d.type} • Linked to ${d.relatedName || d.relatedType}`,
            tag: 'Document',
            tab: 'documents',
            icon: FileText,
            colorTheme: {
              bg: 'bg-indigo-50',
              text: 'text-indigo-700',
              border: 'border-indigo-100',
              badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
            }
          });
        }
      });
    }

    return res;
  }, [trimmed, people, organizations, programs, events, tasks, documents]);

  // Filtered by selected Category
  const results = useMemo(() => {
    if (selectedCategory === 'all') return allResults;
    return allResults.filter(item => item.type === selectedCategory);
  }, [allResults, selectedCategory]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    return {
      all: allResults.length,
      person: allResults.filter(r => r.type === 'person').length,
      organization: allResults.filter(r => r.type === 'organization').length,
      program: allResults.filter(r => r.type === 'program').length,
      event: allResults.filter(r => r.type === 'event').length,
      task: allResults.filter(r => r.type === 'task').length,
      document: allResults.filter(r => r.type === 'document').length,
    };
  }, [allResults]);

  const handleSelectResult = (item: typeof results[0]) => {
    onNavigate(item.tab, item.id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    }
  };

  const categoryPills: Array<{ id: SearchCategory; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'person', label: 'People' },
    { id: 'organization', label: 'Organizations' },
    { id: 'program', label: 'Programs' },
    { id: 'event', label: 'Events' },
    { id: 'task', label: 'Tasks' },
    { id: 'document', label: 'Documents' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-center p-3 sm:p-5 sm:pt-16 md:pt-20"
          onClick={onClose}
        >
          {/* Glassmorphic Light-Themed Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.9)] border border-white/80 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Glassmorphic Search Input Header */}
            <div className="p-4 sm:p-5 pb-3 border-b border-zinc-100/80 bg-white/40 backdrop-blur-xs">
              <div className="relative flex items-center bg-white/70 hover:bg-white/85 focus-within:bg-white backdrop-blur-md focus-within:backdrop-blur-xl rounded-full px-4 py-2.5 border border-white/90 hover:border-zinc-200/80 focus-within:border-[#140a8e]/40 focus-within:ring-3 focus-within:ring-[#140a8e]/10 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] focus-within:shadow-[0_6px_20px_rgba(20,10,142,0.08)]">
                {/* Glassmorphic Search Icon */}
                <div className="w-6 h-6 rounded-full bg-white/80 border border-white/90 flex items-center justify-center shrink-0 mr-2.5 shadow-2xs">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                </div>

                {/* Input element */}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search records, people, programs, events, documents..."
                  className="w-full bg-transparent text-sm sm:text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden font-sans tracking-tight"
                />

                {/* Right controls: Clear button and Close button */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {query ? (
                    <button 
                      onClick={() => {
                        setQuery('');
                        setSelectedIndex(0);
                      }}
                      className="w-6 h-6 rounded-full bg-white/80 hover:bg-white border border-white/90 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="w-6 h-6 rounded-full hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Minimal Category Filter Pills */}
              {trimmed.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-none">
                  {categoryPills.map(pill => {
                    const count = categoryCounts[pill.id];
                    const isActive = selectedCategory === pill.id;
                    if (count === 0 && pill.id !== 'all') return null;

                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(pill.id);
                          setSelectedIndex(0);
                        }}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 shrink-0 cursor-pointer
                          ${isActive 
                            ? 'bg-[#140a8e] text-white font-medium shadow-2xs' 
                            : 'bg-zinc-100 hover:bg-zinc-200/70 text-zinc-600'}
                        `}
                      >
                        <span>{pill.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results or Discovery Section */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
              {query.trim() === '' ? (
                /* Minimal Discovery & Quick Suggestions Experience */
                <div className="py-3 space-y-4">
                  {/* Quick Smart Search Suggestions */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">
                      Suggested Searches
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Sarah Thompson', query: 'Sarah Thompson' },
                        { label: 'Youth Leadership', query: 'Youth Leadership' },
                        { label: 'Accessibility Lab', query: 'Accessibility' },
                        { label: 'Trillium Foundation', query: 'Trillium Foundation' },
                        { label: 'Research Methodology', query: 'Research Methodology' }
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => {
                            setQuery(item.query);
                            setSelectedIndex(0);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80 rounded-full text-xs font-normal shadow-2xs hover:border-[#140a8e]/30 transition-all cursor-pointer"
                        >
                          <TrendingUp className="w-3 h-3 text-[#140a8e]" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Hub Categories */}
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
                      Explore Records
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { title: 'People', count: `${people.length} Contacts`, tab: 'people' as NavTab, icon: Users },
                        { title: 'Programs', count: `${programs.length} Cohorts`, tab: 'programs' as NavTab, icon: Compass },
                        { title: 'Events', count: `${events.length} Sessions`, tab: 'events' as NavTab, icon: Calendar },
                        { title: 'Documents', count: `${documents.length} Files`, tab: 'documents' as NavTab, icon: FileText }
                      ].map(hub => {
                        const HubIcon = hub.icon;
                        return (
                          <div
                            key={hub.title}
                            onClick={() => {
                              onNavigate(hub.tab);
                              onClose();
                            }}
                            className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/70 flex flex-col gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-center text-[#140a8e]">
                              <HubIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-900">{hub.title}</p>
                              <p className="text-[11px] text-zinc-500">{hub.count}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : results.length === 0 ? (
                /* Empty state when query gives 0 results */
                <div className="py-12 px-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-2.5">
                    <Search className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-medium text-zinc-800 mb-1">
                    No results found
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    No records matched "{query}". Try checking spelling or using broader keywords.
                  </p>
                </div>
              ) : (
                /* Minimal Results List */
                <div className="space-y-1.5">
                  {results.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelectResult(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`
                          p-2.5 sm:p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors
                          border
                          ${isSelected 
                            ? 'bg-[#140a8e]/5 border-[#140a8e]/20 ring-1 ring-[#140a8e]/15' 
                            : 'bg-white hover:bg-zinc-50 border-zinc-200/60'}
                        `}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Squircle App Icon */}
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.colorTheme.bg} ${item.colorTheme.border} ${item.colorTheme.text}`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-zinc-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${item.colorTheme.badgeBg}`}>
                            {item.tag}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Minimal Clean Bottom Footer (No shortcut keys) */}
            <div className="px-5 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="font-normal text-zinc-600">
                {results.length > 0 ? `${results.length} record${results.length > 1 ? 's' : ''} found` : 'Search records'}
              </span>

              <span className="font-serif italic text-zinc-400">
                The Inclusion Project
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
