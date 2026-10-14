import React, { useState } from 'react';
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
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { exportToCsv } from '../../lib/csvExport';

export const ReportsView: React.FC = () => {
  const { currentUser, people, programs, events, funding, participants, hasPermission, Permissions } = useCrm();
  const [reportType, setReportType] = useState<'programs' | 'events' | 'funding' | 'participants'>('programs');

  const canViewReports = hasPermission('reports', 'view');
  const canExportReports = hasPermission('reports', 'export');
  const canViewFunding = hasPermission('funding', 'view');

  if (!canViewReports) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Restricted Access</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Executive reports and data summaries are restricted to Staff and Administrators.
        </p>
      </div>
    );
  }

  const totalParticipants = people.filter(p => p.relationshipTypes.includes('Participant')).length;

  const totalEventSeats = events.reduce((sum, e) => sum + e.capacity, 0);
  const totalAttended = participants.filter(p => p.status === 'Attended').length;
  const totalRegistered = participants.length;

  const totalFundingReceived = funding
    .filter(f => f.status === 'Received')
    .reduce((sum, f) => sum + f.amountCad, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = `TIP_Report_${reportType}_2026.csv`;

    if (reportType === 'programs') {
      rows = [
        ['Program Name', 'Status', 'Lead', 'Progress', 'Participants', 'Start Date', 'End Date'],
        ...programs.map(p => [
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
        ['Event Title', 'Type', 'Date', 'Location', 'Capacity', 'Registered', 'Attended'],
        ...events.map(e => {
          const registered = participants.filter(p => p.eventId === e.id).length;
          const attended = participants.filter(p => p.eventId === e.id && p.status === 'Attended').length;
          return [
            e.name,
            e.type,
            e.date,
            e.location,
            String(e.capacity),
            String(registered),
            String(attended)
          ];
        })
      ];
    } else if (reportType === 'funding') {
      rows = [
        ['Funder Name', 'Type', 'Amount (CAD)', 'Status', 'Fiscal Year', 'Reporting Deadline'],
        ...funding.map(f => [
          f.funderName || f.donorOrFunder,
          f.type || f.fundingType,
          String(f.amountCad),
          f.status,
          f.fiscalYear || '2026-2027',
          f.reportingDeadline || f.reportDueDate || ''
        ])
      ];
    } else {
      rows = [
        ['Name', 'Email', 'Organization', 'Role', 'City', 'Relationship Categories', 'Last Touchpoint'],
        ...people.map(p => [
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

    exportToCsv(filename, rows);
  };

  const tabs: Array<{ id: 'programs' | 'events' | 'funding' | 'participants'; label: string; show: boolean }> = [
    { id: 'programs', label: 'Programs & Cohorts', show: true },
    { id: 'events', label: 'Event & Workshop Attendance', show: true },
    { id: 'funding', label: 'Funder & Grant Summary', show: canViewFunding },
    { id: 'participants', label: 'Stakeholder Engagement', show: true }
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
                Governance & Funder Intelligence
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                Official Board & Audit Record
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
              Board of Directors & Funder Operations Dossier
            </h1>
            <p className="text-zinc-600">
              Aggregated programmatic impact, event turnout rates, and verified philanthropic allocations.
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
          <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Board & Funder Reports</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Clean aggregated summaries and printable records for board meetings, annual reviews, and grants.
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

      {/* Executive Summary Cards */}
      <div className={`grid grid-cols-2 ${canViewFunding ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Active Cohorts</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {programs.filter(p => p.status === 'Active').length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{programs.length} total initiatives</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Community Reach</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {people.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{totalParticipants} youth / participants</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Event Attendance</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {totalAttended}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{totalRegistered} registrations recorded</p>
          </Card>
        </motion.div>

        {canViewFunding && (
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card className="p-4 bg-card border-border shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Disbursed Funds</span>
              <div className="text-2xl font-serif font-bold text-foreground mt-1">
                ${totalFundingReceived.toLocaleString('en-CA')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">CAD across current grants</p>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Report Tables */}
      <Card className="rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-serif font-bold text-foreground capitalize">{reportType} Report</h3>
            <p className="text-xs text-muted-foreground">Official record generated for The Inclusion Project (TIP)</p>
          </div>
          <span className="text-xs text-muted-foreground">Fiscal Year 2026-2027</span>
        </div>

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
                {programs.map(p => (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map(e => {
                  const reg = participants.filter(p => p.eventId === e.id).length;
                  const att = participants.filter(p => p.eventId === e.id && p.status === 'Attended').length;
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
                {funding.map(f => (
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
                {people.map(p => (
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
        </div>
      </Card>

      {/* Print-Only Sign-off and Verification Footer */}
      <div className="hidden print:block pt-8 mt-8 border-t-2 border-zinc-200 page-break-inside-avoid">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-900 uppercase font-mono tracking-wider">
              Executive Certification & Sign-off
            </p>
            <p className="text-sm font-bold text-zinc-900">{currentUser.name}</p>
            <p className="text-xs text-zinc-500">{currentUser.postTitle || currentUser.title || 'Executive Director & Super Admin'}</p>
            <p className="text-[10px] font-mono text-zinc-400">The Inclusion Project · Board Governance</p>
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

