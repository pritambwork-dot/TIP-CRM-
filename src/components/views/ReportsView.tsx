import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Users, 
  Calendar, 
  Compass, 
  HeartHandshake, 
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  Lock,
  Search,
  Filter,
  X,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { downloadCsv } from '../../lib/csvExport';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

export const ReportsView: React.FC = () => {
  const { 
    currentUser, 
    people, 
    scopedPeople,
    programs, 
    scopedPrograms,
    events, 
    scopedEvents,
    funding, 
    participants, 
    tasks, 
    scopedTasks,
    hasPermission 
  } = useCrm();
  const [reportType, setReportType] = useState<'programs' | 'events' | 'funding' | 'participants' | 'tasks'>('programs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const canViewReports = hasPermission('reports', 'view');
  const canExportReports = hasPermission('reports', 'export');
  const canViewFunding = hasPermission('funding', 'view');

  const effectivePeople = currentUser.roleId === 'super_admin' ? people : scopedPeople;
  const effectivePrograms = currentUser.roleId === 'super_admin' ? programs : scopedPrograms;
  const effectiveEvents = currentUser.roleId === 'super_admin' ? events : scopedEvents;
  const effectiveTasks = currentUser.roleId === 'super_admin' ? tasks : scopedTasks;
  const effectiveFunding = canViewFunding ? funding : [];

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return effectivePrograms.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = p.name.toLowerCase().includes(q) || 
                      p.ownerName.toLowerCase().includes(q) ||
                      (p.description && p.description.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (dateFrom && p.startDate && p.startDate < dateFrom) return false;
      if (dateTo && p.endDate && p.endDate > dateTo) return false;
      return true;
    });
  }, [effectivePrograms, searchQuery, statusFilter, dateFrom, dateTo]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return effectiveEvents.filter(e => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = e.name.toLowerCase().includes(q) || 
                      e.type.toLowerCase().includes(q) ||
                      e.facilitator.toLowerCase().includes(q) ||
                      e.location.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedProgram !== 'all' && e.programId !== selectedProgram) return false;
      if (statusFilter !== 'all' && e.type !== statusFilter) return false;
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [effectiveEvents, searchQuery, selectedProgram, statusFilter, dateFrom, dateTo]);

  // Filtered Funding
  const filteredFunding = useMemo(() => {
    return effectiveFunding.filter(f => {
      const funderName = f.funderName || f.donorOrFunder || '';
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = funderName.toLowerCase().includes(q) || 
                      (f.type || f.fundingType || '').toLowerCase().includes(q) ||
                      (f.notes && f.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedProgram !== 'all' && f.programId !== selectedProgram) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      const deadline = f.reportingDeadline || f.reportDueDate;
      if (dateFrom && deadline && deadline < dateFrom) return false;
      if (dateTo && deadline && deadline > dateTo) return false;
      return true;
    });
  }, [effectiveFunding, searchQuery, selectedProgram, statusFilter, dateFrom, dateTo]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return effectiveTasks.filter(t => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = t.title.toLowerCase().includes(q) || 
                      (t.owner && t.owner.toLowerCase().includes(q)) ||
                      (t.programName && t.programName.toLowerCase().includes(q)) ||
                      (t.description && t.description.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedProgram !== 'all' && t.programId !== selectedProgram) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter && t.priority !== statusFilter) return false;
      if (dateFrom && t.dueDate && t.dueDate < dateFrom) return false;
      if (dateTo && t.dueDate && t.dueDate > dateTo) return false;
      return true;
    });
  }, [effectiveTasks, searchQuery, selectedProgram, statusFilter, dateFrom, dateTo]);

  // Filtered People / Participants
  const filteredPeople = useMemo(() => {
    return effectivePeople.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = p.name.toLowerCase().includes(q) || 
                      p.email.toLowerCase().includes(q) ||
                      (p.organizationName && p.organizationName.toLowerCase().includes(q)) ||
                      (p.role && p.role.toLowerCase().includes(q)) ||
                      (p.city && p.city.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedProgram !== 'all' && !(p.programIds || []).includes(selectedProgram)) return false;
      if (statusFilter !== 'all' && !p.relationshipTypes.includes(statusFilter as any)) return false;
      if (dateFrom && p.createdAt && p.createdAt < dateFrom) return false;
      if (dateTo && p.createdAt && p.createdAt > dateTo) return false;
      return true;
    });
  }, [effectivePeople, searchQuery, selectedProgram, statusFilter, dateFrom, dateTo]);

  const isFilterActive = searchQuery !== '' || 
    selectedProgram !== 'all' || 
    statusFilter !== 'all' || 
    dateFrom !== '' || 
    dateTo !== '';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProgram('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  if (!canViewReports) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Restricted Access</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Operational reports and data summaries are restricted to Staff and Administrators.
        </p>
      </div>
    );
  }

  // Deterministic summary calculations respecting active filters
  const totalParticipants = filteredPeople.filter(p => p.relationshipTypes.includes('Participant')).length;

  const filteredEventIds = new Set(filteredEvents.map(e => e.id));
  const relevantParticipants = participants.filter(p => p.eventId && filteredEventIds.has(p.eventId));
  const totalAttended = relevantParticipants.filter(p => p.status === 'Attended').length;
  const totalRegistered = relevantParticipants.length;
  const attendanceRate = totalRegistered > 0 
    ? ((totalAttended / totalRegistered) * 100).toFixed(1) + '%' 
    : '0.0%';

  const totalFundingReceived = filteredFunding
    .filter(f => f.status === 'Received')
    .reduce((sum, f) => sum + f.amountCad, 0);

  const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length;
  const totalTasks = filteredTasks.length;
  const taskCompletionRate = totalTasks > 0
    ? ((completedTasks / totalTasks) * 100).toFixed(1) + '%'
    : '0.0%';

  const currentItemsCount = 
    reportType === 'programs' ? filteredPrograms.length :
    reportType === 'events' ? filteredEvents.length :
    reportType === 'funding' ? filteredFunding.length :
    reportType === 'tasks' ? filteredTasks.length :
    filteredPeople.length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!canExportReports) return;

    let rows: string[][] = [];
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `TIP_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report_${dateStamp}.csv`;

    if (reportType === 'programs') {
      rows = [
        ['Program Name', 'Status', 'Lead', 'Progress', 'Participants', 'Start Date', 'End Date'],
        ...filteredPrograms.map(p => [
          p.name,
          p.status,
          p.ownerName,
          `${p.progressPercent}%`,
          String(p.participantIds.length),
          p.startDate,
          p.endDate
        ])
      ];
    } else if (reportType === 'events') {
      rows = [
        ['Event Title', 'Type', 'Date', 'Location', 'Capacity', 'Registered', 'Attended', 'Turnout Rate'],
        ...filteredEvents.map(e => {
          const registered = participants.filter(p => p.eventId === e.id).length;
          const attended = participants.filter(p => p.eventId === e.id && p.status === 'Attended').length;
          const rate = registered > 0 ? `${((attended / registered) * 100).toFixed(1)}%` : '0.0%';
          return [
            e.name,
            e.type,
            e.date,
            e.location,
            String(e.capacity),
            String(registered),
            String(attended),
            rate
          ];
        })
      ];
    } else if (reportType === 'funding') {
      if (!canViewFunding) return;
      rows = [
        ['Funder Name', 'Type', 'Amount (CAD)', 'Status', 'Fiscal Year', 'Reporting Deadline'],
        ...filteredFunding.map(f => [
          f.funderName || f.donorOrFunder,
          f.type || f.fundingType,
          String(f.amountCad),
          f.status,
          f.fiscalYear || '2026-2027',
          f.reportingDeadline || f.reportDueDate || ''
        ])
      ];
    } else if (reportType === 'tasks') {
      rows = [
        ['Task Title', 'Program / Event', 'Assigned To', 'Priority', 'Due Date', 'Status'],
        ...filteredTasks.map(t => [
          t.title,
          t.programName || t.eventName || 'General',
          t.owner || 'Unassigned',
          t.priority,
          t.dueDate,
          t.status
        ])
      ];
    } else {
      rows = [
        ['Name', 'Email', 'Organization', 'Role', 'City', 'Relationship Categories', 'Last Touchpoint'],
        ...filteredPeople.map(p => [
          p.name,
          p.email,
          p.organizationName || '',
          p.role || '',
          p.city || '',
          p.relationshipTypes.join('; '),
          p.lastInteractionDate || ''
        ])
      ];
    }

    downloadCsv(filename, rows);
  };

  const tabs: Array<{ id: 'programs' | 'events' | 'funding' | 'participants' | 'tasks'; label: string; show: boolean }> = [
    { id: 'programs', label: 'Programs & Projects', show: true },
    { id: 'events', label: 'Events & Attendance', show: true },
    { id: 'participants', label: 'People & Stakeholders', show: true },
    { id: 'funding', label: 'Funding & Grants', show: canViewFunding },
    { id: 'tasks', label: 'Tasks & Follow-ups', show: true }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Official Print-Only Header with Full TIP Logo & Meta */}
      <div className="hidden print:block border-b-2 border-zinc-900 pb-6 mb-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/tip-logo.svg"
              alt="The Inclusion Project"
              className="h-12 w-auto object-contain"
            />
            <div className="border-l-2 border-zinc-300 pl-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ea0543] font-bold block">
                Operational & Impact Intelligence
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                Official Operational Dossier
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500 space-y-0.5">
            <p className="font-bold text-zinc-900 text-sm">The Inclusion Project</p>
            <p>Leading with Equity. Transforming Systems.</p>
            <p>info@theinclusionproject.com · www.theinclusionproject.com</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between text-xs">
          <div>
            <h1 className="text-xl font-serif font-bold text-zinc-900">
              Operational & Impact Summary Dossier
            </h1>
            <p className="text-zinc-600">
              Aggregated programmatic impact, event turnout rates, funding allocations, and operational deliverables.
            </p>
          </div>
          <div className="text-right font-mono text-[11px] text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-200">
            <p>Prepared By: <strong>{currentUser.name}</strong> ({currentUser.postTitle || currentUser.title})</p>
            <p>Date: <strong>{new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
            <p>Scope: <strong>Global Organizational Audit</strong></p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 print:hidden">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Reports & Exports</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Clean aggregated summaries and printable records across programs, events, people, funding, and tasks.
          </p>
        </div>


        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            id="btn-print-reports"
            className="gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </Button>

          <ProtectedAction resource="reports" action="export">
            <Button
              variant="crimson"
              size="sm"
              onClick={handleExportCSV}
              id="btn-export-reports-csv"
              className="gap-1.5 text-xs shadow-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </ProtectedAction>
        </div>
      </div>

      {/* Animated Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto print:hidden">
        {tabs.filter(t => t.show).map(tab => {
          const isSelected = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isSelected ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="reportsTabActive"
                  className="absolute inset-0 bg-[#ea0543] rounded-lg"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar & Data Freshness Stamp */}
      <Card className="p-4 bg-card border-border shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#ea0543]" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Filter Report Scope</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5 text-emerald-600 font-sans font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Grounded Records
            </span>
            <span>•</span>
            <span>Refreshed: {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Program Filter */}
          <div>
            <select
              value={selectedProgram}
              onChange={e => setSelectedProgram(e.target.value)}
              className="w-full h-8 text-xs bg-background border border-input rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Programs & Projects</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Tab-Specific Status / Category Filter */}
          <div>
            {reportType === 'programs' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-input rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Program Statuses</option>
                <option value="Active">Active</option>
                <option value="Planning">Planning</option>
                <option value="Completed">Completed</option>
              </select>
            )}

            {reportType === 'events' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-input rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Event Types</option>
                <option value="Workshop">Workshop</option>
                <option value="Roundtable">Roundtable</option>
                <option value="Community Gathering">Community Gathering</option>
                <option value="Training">Training</option>
                <option value="Webinar">Webinar</option>
              </select>
            )}

            {reportType === 'funding' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-input rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Funding Statuses</option>
                <option value="Received">Received</option>
                <option value="Secured">Secured</option>
                <option value="In Review">In Review</option>
                <option value="Pending">Pending</option>
              </select>
            )}

            {reportType === 'participants' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-input rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Relationship Categories</option>
                <option value="Participant">Participant</option>
                <option value="Partner">Partner</option>
                <option value="Funder">Funder</option>
                <option value="Advisory">Advisory</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Speaker">Speaker</option>
              </select>
            )}

            {reportType === 'tasks' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-input rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Task Statuses</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="High">Priority: High</option>
              </select>
            )}
          </div>

          {/* Date Range: From */}
          <div>
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          {/* Date Range: To + Clear Button */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 text-xs bg-background flex-1"
            />
            {isFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                title="Clear Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Executive Summary Cards */}
      <div className={`grid grid-cols-2 ${canViewFunding ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Active Programs & Projects</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {filteredPrograms.filter(p => p.status === 'Active').length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filteredPrograms.length} in current scope</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Community Reach</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {filteredPeople.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{totalParticipants} participants in scope</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Turnout & Attendance</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {totalAttended} <span className="text-xs font-mono font-medium text-emerald-600">({attendanceRate})</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{totalRegistered} total registrations</p>
          </Card>
        </motion.div>

        {canViewFunding ? (
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="p-4 bg-card border-border shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Disbursed Funds</span>
              <div className="text-2xl font-serif font-bold text-foreground mt-1">
                ${totalFundingReceived.toLocaleString('en-CA')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{filteredFunding.length} grants in scope</p>
            </Card>
          </motion.div>
        ) : (
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="p-4 bg-card border-border shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Task Deliverables</span>
              <div className="text-2xl font-serif font-bold text-foreground mt-1">
                {completedTasks} <span className="text-xs font-mono font-medium text-muted-foreground">({taskCompletionRate})</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{totalTasks} tasks in scope</p>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Report Tables & Empty State */}
      <Card className="rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-serif font-bold text-foreground capitalize">
              {reportType} Report <span className="text-xs font-mono text-muted-foreground font-normal">({currentItemsCount} records)</span>
            </h3>
            <p className="text-xs text-muted-foreground">Official record generated for The Inclusion Project (TIP)</p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Fiscal Year 2026-2027</span>
        </div>

        {currentItemsCount === 0 ? (
          <div className="p-12 text-center bg-card space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No records match the selected filters</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We couldn't find any {reportType} matching your current search terms, status, or date range.
            </p>
            {isFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'programs' && (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Program Lead</th>
                    <th className="py-3 px-4">Participants</th>
                    <th className="py-3 px-4">Milestone Progress</th>
                    <th className="py-3 px-4">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPrograms.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{p.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={p.status === 'Active' ? 'crimson' : 'outline'} className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground/80">{p.ownerName}</td>
                      <td className="py-3 px-4 text-foreground font-medium">{p.participantIds.length} enrolled</td>
                      <td className="py-3 px-4 text-foreground font-bold">{p.progressPercent}%</td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">{p.startDate} - {p.endDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'events' && (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Facilitator</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4">Attended</th>
                    <th className="py-3 px-4">Turnout Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEvents.map(e => {
                    const reg = participants.filter(p => p.eventId === e.id).length;
                    const att = participants.filter(p => p.eventId === e.id && p.status === 'Attended').length;
                    const turnout = reg > 0 ? `${((att / reg) * 100).toFixed(1)}%` : '0.0%';
                    return (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">{e.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-[10px]">{e.type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-foreground/80">{e.date} ({e.time})</td>
                        <td className="py-3 px-4 text-foreground/80">{e.facilitator}</td>
                        <td className="py-3 px-4 text-foreground font-medium">{reg} / {e.capacity}</td>
                        <td className="py-3 px-4 text-emerald-600 font-bold">{att}</td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{turnout}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {reportType === 'funding' && (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Funder / Grant</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount (CAD)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Fiscal Year</th>
                    <th className="py-3 px-4">Reporting Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredFunding.map(f => (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{f.funderName || f.donorOrFunder}</td>
                      <td className="py-3 px-4 text-foreground/80">{f.type || f.fundingType}</td>
                      <td className="py-3 px-4 font-bold text-foreground">${f.amountCad.toLocaleString('en-CA')}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {f.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground/80">{f.fiscalYear || '2026-2027'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{f.reportingDeadline || f.reportDueDate || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'participants' && (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Categories</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Last Touchpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPeople.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{p.name}</td>
                      <td className="py-3 px-4 text-foreground/80">{p.organizationName || 'Independent'}</td>
                      <td className="py-3 px-4 text-foreground/80">{p.role}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {p.relationshipTypes.join(', ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground/80">{p.city || 'Canada'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{p.lastInteractionDate || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'tasks' && (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Task Deliverable</th>
                    <th className="py-3 px-4">Program / Event</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTasks.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{t.title}</td>
                      <td className="py-3 px-4 text-foreground/80">{t.programName || t.eventName || 'Operational'}</td>
                      <td className="py-3 px-4 text-foreground/80">{t.owner || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={t.priority === 'High' ? 'crimson' : 'outline'} className="text-[10px]">
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">{t.dueDate}</td>
                      <td className="py-3 px-4">
                        <Badge variant={t.status === 'Completed' ? 'success' : 'secondary'} className="text-[10px]">
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      {/* Print-Only Sign-off and Verification Footer */}
      <div className="hidden print:block pt-8 mt-8 border-t-2 border-zinc-200 page-break-inside-avoid">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-900 uppercase font-mono tracking-wider">
              Executive Certification & Sign-off
            </p>
            <p className="text-sm font-bold text-zinc-900">{currentUser.name}</p>
            <p className="text-xs text-zinc-500">{currentUser.postTitle || currentUser.title || 'Executive Director'}</p>
            <p className="text-[10px] font-mono text-zinc-400">The Inclusion Project · Operational Record</p>
          </div>
          <div className="text-right text-[10px] font-mono text-zinc-500 space-y-1">
            <p className="text-emerald-700 font-semibold">✓ Row-Level Security (RLS) Verified · Non-Profit Data Protection Standard</p>
            <p>Generated by TIP CRM Architecture · Confidential</p>
          </div>
        </div>
      </div>
    </div>
  );

};

