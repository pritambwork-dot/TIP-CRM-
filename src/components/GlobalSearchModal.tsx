import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Users, 
  Building2, 
  Compass, 
  Calendar, 
  CheckSquare, 
  FileText, 
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Settings,
  LayoutDashboard,
  X,
  ArrowRight,
  CornerDownLeft,
  Command,
  SlidersHorizontal,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { NavTab } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export type SearchCategory = 
  | 'all' 
  | 'people' 
  | 'organizations' 
  | 'programs' 
  | 'funding' 
  | 'events' 
  | 'tasks' 
  | 'documents'
  | 'users'
  | 'actions';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  tag: string;
  tab: NavTab;
  recordId?: string;
  icon: React.ElementType;
  badgeVariant: 'default' | 'crimson' | 'indigo' | 'secondary' | 'outline' | 'success' | 'warning';
  extraMeta?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab, recordId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { 
    people, 
    scopedPeople,
    organizations, 
    programs, 
    scopedPrograms,
    projects,
    events, 
    scopedEvents,
    tasks, 
    scopedTasks,
    funding,
    documents,
    users,
    currentUser,
    hasPermission,
    canViewFunding
  } = useCrm();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);

  // Auto focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global hotkey ⌘K / Ctrl+K and ESC listener
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

  // Keep selected item scrolled into view when using arrow keys
  useEffect(() => {
    if (resultListRef.current) {
      const activeElement = resultListRef.current.querySelector(`[data-result-index="${selectedIndex}"]`) as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Effective records considering user permissions and data scopes
  const visiblePeople = currentUser.roleId === 'super_admin' ? people : scopedPeople;
  const visiblePrograms = currentUser.roleId === 'super_admin' ? programs : scopedPrograms;
  const visibleProgramIds = useMemo(() => new Set(visiblePrograms.map(p => p.id)), [visiblePrograms]);
  const visibleProjects = useMemo(() => projects.filter(prj => visibleProgramIds.has(prj.programId)), [projects, visibleProgramIds]);
  const visibleEvents = currentUser.roleId === 'super_admin' ? events : scopedEvents;
  const visibleTasks = currentUser.roleId === 'super_admin' ? tasks : scopedTasks;
  const visibleFunding = (canViewFunding && hasPermission('funding', 'view')) ? funding : [];
  const visibleOrganizations = hasPermission('organizations', 'view') ? organizations : [];
  const visibleDocuments = hasPermission('documents', 'view') ? documents : [];
  const visibleUsers = (hasPermission('settings', 'view') || currentUser.roleId === 'super_admin') ? users : [];

  // ============================================================================
  // MULTI-MODEL SEARCH INDEXING & COMPREHENSIVE QUERY FILTERING
  // ============================================================================
  const allResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    // Helper to check match
    const matches = (...fields: (string | undefined | null)[]): boolean => {
      if (!trimmed) return false;
      return fields.some(f => f && f.toLowerCase().includes(trimmed));
    };

    if (trimmed.length > 0) {
      // 1. Quick Navigation Actions (Permission gated)
      const quickActions: Array<{
        name: string;
        desc: string;
        tab: NavTab;
        icon: React.ElementType;
        keywords: string[];
        show: boolean;
      }> = [
        {
          name: 'AI Intelligence & CSV Analytics',
          desc: 'Run deterministic audit, AI synthesis, and high-res executive reports',
          tab: 'intelligence',
          icon: Sparkles,
          keywords: ['ai', 'intelligence', 'csv', 'analytics', 'upload', 'report', 'charts', 'data', 'audit'],
          show: hasPermission('intelligence', 'view')
        },
        {
          name: 'Reports & Exports',
          desc: 'Programs, events, stakeholders, funding, and task reports with CSV exports',
          tab: 'reports',
          icon: BarChart3,
          keywords: ['report', 'reports', 'exports', 'csv', 'funding', 'tasks', 'events', 'stakeholders', 'dossier', 'download'],
          show: hasPermission('reports', 'view')
        },
        {
          name: 'Donors & Funding Directory',
          desc: 'Grants, contributions, corporate sponsors, and revenue pipeline',
          tab: 'funding',
          icon: HeartHandshake,
          keywords: ['funding', 'grant', 'grants', 'donor', 'donors', 'money', 'contribution', 'pipeline'],
          show: canViewFunding && hasPermission('funding', 'view')
        },
        {
          name: 'Tasks & Team Follow-ups',
          desc: 'Review upcoming actions, assigned staff tasks, and deadlines',
          tab: 'tasks',
          icon: CheckSquare,
          keywords: ['task', 'tasks', 'todo', 'followup', 'deadline', 'assigned'],
          show: hasPermission('tasks', 'view')
        },
        {
          name: 'Organization Settings & Access Control',
          desc: 'User management, permissions, account provisioning, and security',
          tab: 'settings',
          icon: Settings,
          keywords: ['settings', 'users', 'access', 'roles', 'password', 'security', 'admin'],
          show: hasPermission('settings', 'view')
        },
        {
          name: 'Operational Dashboard',
          desc: 'CRM home overview with active programs and recent engagements',
          tab: 'dashboard',
          icon: LayoutDashboard,
          keywords: ['dashboard', 'home', 'overview', 'summary'],
          show: true
        }
      ];

      quickActions.filter(a => a.show).forEach(action => {
        if (
          action.name.toLowerCase().includes(trimmed) ||
          action.desc.toLowerCase().includes(trimmed) ||
          action.keywords.some(k => k.includes(trimmed))
        ) {
          items.push({
            id: `action-${action.tab}`,
            category: 'actions',
            title: action.name,
            subtitle: action.desc,
            tag: 'Navigation',
            tab: action.tab,
            icon: action.icon,
            badgeVariant: 'crimson'
          });
        }
      });

      // 2. People & Contacts
      visiblePeople.forEach(p => {
        const isMatch = matches(
          p.name,
          p.email,
          p.phone,
          p.organizationName,
          p.role,
          p.city,
          p.notes,
          ...p.relationshipTypes,
          ...p.interests
        );

        if (isMatch) {
          items.push({
            id: p.id,
            recordId: p.id,
            category: 'people',
            title: p.name,
            subtitle: `${p.role || 'Contact'} ${p.organizationName ? `• ${p.organizationName}` : ''} ${p.city ? `(${p.city})` : ''}`,
            tag: p.relationshipTypes[0] || 'Contact',
            tab: 'people',
            icon: Users,
            badgeVariant: 'outline',
            extraMeta: p.email
          });
        }
      });

      // 3. Organizations & Community Partners
      visibleOrganizations.forEach(o => {
        const isMatch = matches(
          o.name,
          o.sector,
          o.type,
          o.city,
          o.province,
          o.primaryContactName,
          o.website,
          o.notes
        );

        if (isMatch) {
          items.push({
            id: o.id,
            recordId: o.id,
            category: 'organizations',
            title: o.name,
            subtitle: `${o.sector} • ${o.city || 'Canada'} ${o.primaryContactName ? `• Contact: ${o.primaryContactName}` : ''}`,
            tag: o.type,
            tab: 'organizations',
            icon: Building2,
            badgeVariant: 'indigo'
          });
        }
      });

      // 4. Programs & Projects
      visiblePrograms.forEach(pr => {
        const isMatch = matches(
          pr.name,
          pr.description,
          pr.ownerName,
          pr.status,
          ...pr.focusAreas
        );

        if (isMatch) {
          items.push({
            id: pr.id,
            recordId: pr.id,
            category: 'programs',
            title: pr.name,
            subtitle: `Status: ${pr.status} • Lead: ${pr.ownerName} • ${pr.focusAreas.slice(0, 2).join(', ')}`,
            tag: 'Program',
            tab: 'programs',
            icon: Compass,
            badgeVariant: 'crimson'
          });
        }
      });

      // 4b. Projects
      visibleProjects.forEach(prj => {
        const isMatch = matches(
          prj.name,
          prj.description,
          prj.ownerName,
          prj.status,
          prj.programName
        );

        if (isMatch) {
          items.push({
            id: prj.id,
            recordId: prj.programId,
            category: 'programs',
            title: prj.name,
            subtitle: `Project under ${prj.programName} • Status: ${prj.status} • Lead: ${prj.ownerName}`,
            tag: 'Project',
            tab: 'programs',
            icon: Briefcase,
            badgeVariant: 'crimson'
          });
        }
      });

      // 5. Grants & Funding (if permitted)
      visibleFunding.forEach(f => {
        const funderTitle = f.donorOrFunder || f.funderName || f.organizationName || 'Grant / Contribution';
        const funderType = f.fundingType || f.type || 'Grant';
        const cadAmount = f.amountCad ?? (f as any).amount ?? 0;
        const formattedAmount = `$${Number(cadAmount).toLocaleString()}`;

        const isMatch = matches(
          funderTitle,
          funderType,
          f.status,
          f.relatedProgramName,
          f.grantDeliverableNote,
          f.notes,
          f.fiscalYear,
          cadAmount.toString(),
          formattedAmount
        );

        if (isMatch) {
          items.push({
            id: f.id,
            recordId: f.id,
            category: 'funding',
            title: funderTitle,
            subtitle: `${funderType} • ${formattedAmount} CAD • ${f.relatedProgramName || 'General Operations'}`,
            tag: f.status,
            tab: 'funding',
            icon: HeartHandshake,
            badgeVariant: 'success',
            extraMeta: formattedAmount
          });
        }
      });

      // 6. Events & Sessions
      visibleEvents.forEach(ev => {
        const isMatch = matches(
          ev.name,
          ev.location,
          ev.facilitator,
          ev.type,
          ev.date,
          ev.description
        );

        if (isMatch) {
          items.push({
            id: ev.id,
            recordId: ev.id,
            category: 'events',
            title: ev.name,
            subtitle: `${ev.date} • ${ev.location} • Facilitator: ${ev.facilitator}`,
            tag: ev.type,
            tab: 'events',
            icon: Calendar,
            badgeVariant: 'secondary'
          });
        }
      });

      // 7. Tasks & Follow-ups
      visibleTasks.forEach(t => {
        const isMatch = matches(
          t.title,
          t.owner,
          t.notes,
          t.status,
          t.priority,
          t.assignedPostName
        );

        if (isMatch) {
          items.push({
            id: t.id,
            recordId: t.id,
            category: 'tasks',
            title: t.title,
            subtitle: `Due: ${t.dueDate} • ${t.priority} Priority • Assigned: ${t.owner}`,
            tag: t.status,
            tab: 'tasks',
            icon: CheckSquare,
            badgeVariant: 'outline'
          });
        }
      });

      // 8. Documents & Cloud Links
      visibleDocuments.forEach(d => {
        const isMatch = matches(
          d.title,
          d.type,
          d.relatedName,
          d.description,
          d.addedBy,
          d.url
        );

        if (isMatch) {
          items.push({
            id: d.id,
            recordId: d.id,
            category: 'documents',
            title: d.title,
            subtitle: `${d.type} • Linked: ${d.relatedName || d.relatedType}`,
            tag: d.type,
            tab: 'documents',
            icon: FileText,
            badgeVariant: 'secondary'
          });
        }
      });

      // 9. Team Users & Access Control
      visibleUsers.forEach(u => {
        const isMatch = matches(
          u.name,
          u.email,
          u.title,
          u.postTitle,
          u.role
        );

        if (isMatch) {
          items.push({
            id: u.id,
            recordId: u.id,
            category: 'users',
            title: u.name,
            subtitle: `${u.postTitle || u.title} • ${u.email}`,
            tag: u.role,
            tab: 'settings',
            icon: ShieldCheck,
            badgeVariant: 'indigo'
          });
        }
      });
    }

    return items;
  }, [
    query, 
    visiblePeople, 
    visibleOrganizations, 
    visiblePrograms, 
    visibleProjects,
    visibleEvents, 
    visibleTasks, 
    visibleFunding, 
    visibleDocuments, 
    visibleUsers,
    hasPermission,
    canViewFunding
  ]);

  // Filtered by selected category pill
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return allResults;
    return allResults.filter(r => r.category === activeCategory);
  }, [allResults, activeCategory]);

  // Compute category match counts
  const categoryCounts = useMemo(() => {
    const counts: Record<SearchCategory, number> = {
      all: allResults.length,
      actions: allResults.filter(r => r.category === 'actions').length,
      people: allResults.filter(r => r.category === 'people').length,
      organizations: allResults.filter(r => r.category === 'organizations').length,
      programs: allResults.filter(r => r.category === 'programs').length,
      funding: allResults.filter(r => r.category === 'funding').length,
      events: allResults.filter(r => r.category === 'events').length,
      tasks: allResults.filter(r => r.category === 'tasks').length,
      documents: allResults.filter(r => r.category === 'documents').length,
      users: allResults.filter(r => r.category === 'users').length
    };
    return counts;
  }, [allResults]);

  // Handle result selection
  const handleSelectResult = (item: SearchResultItem) => {
    onNavigate(item.tab, item.recordId);
    onClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      }
    }
  };

  // Quick search suggestions
  const suggestedQueries = [
    { label: 'Dr. Fatima Al-Mansoor', category: 'people' },
    { label: 'Ontario Trillium Foundation', category: 'funding' },
    { label: 'Youth Leadership Initiative', category: 'programs' },
    { label: 'Civic Accessibility Workshop', category: 'events' },
    { label: 'CSV Analytics', category: 'actions' },
    { label: 'Board Reports', category: 'actions' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-16"
          onClick={onClose}
        >
          {/* Glassmorphic Light-Themed Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="w-full max-w-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.9)] border border-white/80 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Glassmorphic Top Search Input Bar */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-100/80 bg-white/40 backdrop-blur-xs flex items-center gap-2.5 shrink-0">
              <div className="relative flex-1 flex items-center bg-white/70 hover:bg-white/85 focus-within:bg-white backdrop-blur-md focus-within:backdrop-blur-xl rounded-full px-4 py-2 border border-white/90 hover:border-zinc-200/80 focus-within:border-[#140a8e]/40 focus-within:ring-3 focus-within:ring-[#140a8e]/10 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] focus-within:shadow-[0_6px_20px_rgba(20,10,142,0.08)]">
                {/* Glassmorphic Search Icon */}
                <div className="w-6 h-6 rounded-full bg-white/80 border border-white/90 flex items-center justify-center shrink-0 mr-2.5 shadow-2xs">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search across people, programs, grants, events, tasks, documents..."
                  className="w-full bg-transparent text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden font-sans tracking-tight"
                />

                {query ? (
                  <button 
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="w-6 h-6 rounded-full bg-white/80 hover:bg-white border border-white/90 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer shrink-0"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-6 h-6 rounded-full hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills (Visible when there are results or a query) */}
            {query.trim().length > 0 && (
              <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    activeCategory === 'all'
                      ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  All ({categoryCounts.all})
                </button>

                {categoryCounts.people > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('people');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'people'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    People ({categoryCounts.people})
                  </button>
                )}

                {categoryCounts.organizations > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('organizations');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'organizations'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Organizations ({categoryCounts.organizations})
                  </button>
                )}

                {categoryCounts.programs > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('programs');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'programs'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Programs ({categoryCounts.programs})
                  </button>
                )}

                {categoryCounts.funding > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('funding');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'funding'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Grants ({categoryCounts.funding})
                  </button>
                )}

                {categoryCounts.events > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('events');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'events'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Events ({categoryCounts.events})
                  </button>
                )}

                {categoryCounts.tasks > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('tasks');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'tasks'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Tasks ({categoryCounts.tasks})
                  </button>
                )}

                {categoryCounts.documents > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('documents');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'documents'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Docs ({categoryCounts.documents})
                  </button>
                )}

                {categoryCounts.actions > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('actions');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      activeCategory === 'actions'
                        ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    Actions ({categoryCounts.actions})
                  </button>
                )}
              </div>
            )}

            {/* Results Body */}
            <div 
              ref={resultListRef}
              className="flex-1 overflow-y-auto p-2 divide-y divide-border/30"
            >
              {query.trim() === '' ? (
                // Empty state: Helpful suggestions and instant quick-jump records
                <div className="py-6 px-4 space-y-6">
                  <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#ea0543]/10 text-[#ea0543] flex items-center justify-center mx-auto shadow-2xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Global Spotlight Search</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Search across all people, partner organizations, scheduled programs, funding grants, tasks, and cloud documents.
                    </p>
                  </div>

                  {/* Suggested Query Chips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                      Suggested Searches
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedQueries.map(s => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            setQuery(s.label);
                            setSelectedIndex(0);
                            inputRef.current?.focus();
                          }}
                          className="px-2.5 py-1 bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 border border-border/40"
                        >
                          <Search className="w-3 h-3 text-muted-foreground" />
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Common Quick Links */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                      Quick Jump Sections
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectResult({
                          id: 'nav-intel',
                          category: 'actions',
                          title: 'AI Intelligence & CSV Analytics',
                          subtitle: 'Data audit, AI narrative synthesis, and PDF dossier generator',
                          tag: 'Analytics',
                          tab: 'intelligence',
                          icon: Sparkles,
                          badgeVariant: 'crimson'
                        })}
                        className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 text-left transition-colors cursor-pointer flex items-center gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#ea0543]/10 text-[#ea0543] flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">CSV Analytics</p>
                          <p className="text-[10px] text-muted-foreground truncate">Audit & Reports</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectResult({
                          id: 'nav-funding',
                          category: 'funding',
                          title: 'Donors & Grants Pipeline',
                          subtitle: 'View active grants and contributions',
                          tag: 'Grants',
                          tab: 'funding',
                          icon: HeartHandshake,
                          badgeVariant: 'success'
                        })}
                        className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 text-left transition-colors cursor-pointer flex items-center gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <HeartHandshake className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">Grants & Funding</p>
                          <p className="text-[10px] text-muted-foreground truncate">$184k Pipeline</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : filteredResults.length === 0 ? (
                // Zero results state
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-2">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">No records found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    No results match "{query}" in {activeCategory === 'all' ? 'any category' : activeCategory}. Try different keywords or check spelling.
                  </p>
                  {activeCategory !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveCategory('all')}
                      className="mt-2 text-xs"
                    >
                      Search all categories ({categoryCounts.all})
                    </Button>
                  )}
                </div>
              ) : (
                // Active Results List
                <div className="space-y-1">
                  {filteredResults.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={`${item.category}-${item.id}`}
                        data-result-index={idx}
                        onClick={() => handleSelectResult(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`
                          p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-120 select-none
                          ${isSelected 
                            ? 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100' 
                            : 'hover:bg-zinc-50 text-zinc-800 dark:hover:bg-zinc-800/60 dark:text-zinc-200'}
                        `}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-[#ea0543] text-white shadow-2xs' 
                              : 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                              <span>{item.title}</span>
                              {item.extraMeta && (
                                <span className="text-[10px] font-mono text-muted-foreground font-normal">
                                  {item.extraMeta}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant={item.badgeVariant} className="text-[10px] capitalize font-medium">
                            {item.tag}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Footer Information Bar */}
            <div className="px-4 py-2.5 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-3">
                <span>{filteredResults.length > 0 ? `${filteredResults.length} match${filteredResults.length > 1 ? 'es' : ''}` : 'TIP Spotlight Search'}</span>
              </div>
              <span className="font-serif italic text-primary font-semibold text-xs">The Inclusion Project</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
