import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ShieldAlert,
  Download,
  AlertCircle,
  Trash2,
  Lock,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FundingRecord, FundingStatus, FundingType } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { OneUiSearchBar } from '../ui/OneUiSearchBar';
import { exportToCsv } from '../../lib/csvExport';

const STATUS_FILTERS: Array<FundingStatus | 'All'> = [
  'All',
  'Received',
  'Pledged',
  'Approved',
  'Applied',
  'Pending Review',
  'Prospective'
];

interface FundingViewProps {
  onSelectPerson?: (personId: string) => void;
  onSelectProgram?: (programId: string) => void;
}

export const FundingView: React.FC<FundingViewProps> = ({
  onSelectPerson,
  onSelectProgram
}) => {
  const { 
    funding, 
    addFunding, 
    updateFunding, 
    deleteFunding, 
    programs, 
    currentUser,
    hasPermission,
    Permissions
  } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FundingStatus | 'All'>('All');

  const canCreateFunding = hasPermission('funding', 'create');
  const canDeleteFunding = hasPermission('funding', 'delete');
  const canExport = hasPermission('reports', 'export');

  // Add funding modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFunderName, setNewFunderName] = useState('');
  const [newType, setNewType] = useState<FundingType>('Grant');
  const [newAmount, setNewAmount] = useState('25000');
  const [newStatus, setNewStatus] = useState<FundingStatus>('Approved');
  const [newFiscalYear, setNewFiscalYear] = useState('2026-2027');
  const [newDeadline, setNewDeadline] = useState('2026-11-30');
  const [newProgramId, setNewProgramId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Access Control: Volunteers cannot see donor/funding financial records
  if (currentUser.role === 'volunteer') {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Restricted Access</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Financial ledgers and donor contributions are restricted to TIP Staff members to maintain donor privacy.
        </p>
      </div>
    );
  }

  const filteredFunding = funding.filter(f => {
    const funder = f.funderName || f.donorOrFunder || '';
    const ftype = f.type || f.fundingType || '';
    const fyear = f.fiscalYear || '2026-2027';

    const matchesStatus = selectedStatus === 'All' ? true : f.status === selectedStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true :
      funder.toLowerCase().includes(q) ||
      ftype.toLowerCase().includes(q) ||
      fyear.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const totalReceived = funding
    .filter(f => f.status === 'Received')
    .reduce((sum, f) => sum + f.amountCad, 0);

  const totalPipeline = funding
    .filter(f => f.status === 'Approved' || f.status === 'Applied' || f.status === 'Pledged' || f.status === 'Pending Review')
    .reduce((sum, f) => sum + f.amountCad, 0);

  const totalRecordedFunding = funding.reduce((sum, f) => sum + (f.amountCad || 0), 0);
  const activeFundersCount = new Set(funding.map(f => f.funderName || f.donorOrFunder).filter(Boolean)).size;
  const fundedProgramsCount = new Set(funding.map(f => f.relatedProgramId || f.programId).filter(Boolean)).size;

  const handleCreateFunding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunderName.trim()) return;

    const programObj = programs.find(p => p.id === newProgramId);

    addFunding({
      donorOrFunder: newFunderName.trim(),
      funderName: newFunderName.trim(),
      fundingType: newType,
      type: newType,
      amountCad: Number(newAmount) || 0,
      date: new Date().toISOString().split('T')[0],
      status: newStatus,
      fiscalYear: newFiscalYear.trim(),
      reportingDeadline: newDeadline || undefined,
      reportDueDate: newDeadline || undefined,
      relatedProgramId: newProgramId || undefined,
      relatedProgramName: programObj?.name || undefined,
      programId: newProgramId || undefined,
      notes: newNotes.trim() || undefined
    });

    setNewFunderName('');
    setNewNotes('');
    setShowAddModal(false);
  };

  const exportFundingCSV = () => {
    const rows = [
      ['Funder Name', 'Type', 'Amount (CAD)', 'Status', 'Fiscal Year', 'Reporting Deadline', 'Notes'],
      ...funding.map(f => [
        f.funderName || f.donorOrFunder,
        f.type || f.fundingType,
        String(f.amountCad),
        f.status,
        f.fiscalYear || '2026-2027',
        f.reportingDeadline || f.reportDueDate || '',
        f.notes || ''
      ])
    ];

    exportToCsv('TIP_Funding_Ledger_2026.csv', rows);
  };

  const getStatusBadgeVariant = (status: FundingStatus) => {
    switch (status) {
      case 'Received': return 'success';
      case 'Approved': return 'indigo';
      case 'Applied':
      case 'Pending Review': return 'warning';
      case 'Pledged': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Donors & Funding Ledger</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Track foundation grants, government funding agreements, and reporting milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProtectedAction resource="reports" action="export">
            <Button
              onClick={exportFundingCSV}
              id="btn-export-funding-csv"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </ProtectedAction>

          <ProtectedAction resource="funding" action="create">
            <Button
              onClick={() => setShowAddModal(true)}
              id="btn-add-funding"
              variant="crimson"
              size="sm"
              className="gap-1.5 text-xs shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add funding</span>
            </Button>
          </ProtectedAction>
        </div>
      </div>

      {/* Funding KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Funds Received</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              ${totalReceived.toLocaleString('en-CA')} CAD
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Disbursed in current fiscal cycle</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline (Approved & Applied)</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              ${totalPipeline.toLocaleString('en-CA')} CAD
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Expected / awaiting decision</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 bg-card border-border shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Deadlines</span>
            <div className="text-2xl font-serif font-bold text-foreground mt-1">
              {funding.filter(f => f.reportingDeadline || f.reportDueDate).length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Grant reports due in Q3/Q4</p>
          </Card>
        </motion.div>
      </div>

      {/* Embedded Funding AI Intelligence (Section 33) */}
      <div className="bg-gradient-to-r from-[#140a8e]/5 via-zinc-50 to-white rounded-2xl border border-border/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#140a8e]/10 text-[#140a8e] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ea0543]" />
              <span>Funding & Grants Intelligence</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono">Restricted RBAC Access</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground font-serif">
            ${totalRecordedFunding.toLocaleString('en-CA')} CAD Total Recorded Funding · {fundedProgramsCount} Program{fundedProgramsCount === 1 ? '' : 's'} Funded
          </h4>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            AI Observations: {funding.length} total funding agreement{funding.length === 1 ? '' : 's'} recorded totaling ${totalRecordedFunding.toLocaleString('en-CA')} CAD (${totalReceived.toLocaleString('en-CA')} CAD received, ${totalPipeline.toLocaleString('en-CA')} CAD in pipeline). {activeFundersCount} distinct funding partner{activeFundersCount === 1 ? '' : 's'} supporting {fundedProgramsCount} initiative{fundedProgramsCount === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="bg-card text-foreground text-xs py-1 px-2.5">
            {activeFundersCount} active funder{activeFundersCount === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <OneUiSearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by funder name, type, or fiscal year..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(st => {
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white font-semibold'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="fundingStatusActive"
                    className="absolute inset-0 bg-[#ea0543] rounded-full"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <span className="relative z-10">{st}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Funding Table */}
      <Card className="rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Funder & Type</th>
                <th className="py-3 px-4">Amount (CAD)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Fiscal Year</th>
                <th className="py-3 px-4">Reporting / Renewal</th>
                <th className="py-3 px-4">Associated Initiative</th>
                {canDeleteFunding && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredFunding.map((item, index) => {
                const programId = item.programId || item.relatedProgramId;
                const program = programs.find(p => p.id === programId);
                const funder = item.funderName || item.donorOrFunder;
                const ftype = item.type || item.fundingType;
                const deadline = item.reportingDeadline || item.reportDueDate;

                return (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-foreground text-xs sm:text-sm">{funder}</p>
                      <p className="text-muted-foreground text-[11px]">{ftype}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-foreground text-sm">
                        ${item.amountCad.toLocaleString('en-CA')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(item.status)} className="text-[10px]">
                        {item.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-foreground/80 font-medium">
                      {item.fiscalYear || '2026-2027'}
                    </td>

                    <td className="py-3.5 px-4 text-foreground/80">
                      {deadline ? (
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {deadline}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None required</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {program ? (
                        <span 
                          onClick={() => onSelectProgram && onSelectProgram(program.id)}
                          className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                        >
                          {program.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">General Operations</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <ProtectedAction resource="funding" action="delete" mode="disable" showLockIcon={false}>
                        <button
                          onClick={() => {
                            if (confirm(`Permanently delete record for "${funder}"?`)) {
                              deleteFunding(item.id);
                            }
                          }}
                          id={`btn-delete-funding-${item.id}`}
                          title="Super Admin: Delete Funding Record"
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </ProtectedAction>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Funding Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Record Funding / Grant</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowAddModal(false)} 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateFunding} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Funder / Donor Organization *</label>
                  <Input 
                    type="text"
                    required
                    placeholder="e.g. Ontario Trillium Foundation"
                    value={newFunderName}
                    onChange={e => setNewFunderName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Contribution Type</label>
                    <select 
                      value={newType}
                      onChange={e => setNewType(e.target.value as FundingType)}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="Grant">Grant</option>
                      <option value="Government">Government</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Corporate Sponsorship">Corporate Sponsorship</option>
                      <option value="Individual Donation">Individual Donation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Amount (CAD) *</label>
                    <Input 
                      type="number"
                      required
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                    <select 
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as FundingStatus)}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="Prospective">Prospective</option>
                      <option value="Applied">Applied</option>
                      <option value="Approved">Approved</option>
                      <option value="Received">Received</option>
                      <option value="Pledged">Pledged</option>
                      <option value="Pending Review">Pending Review</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Fiscal Year</label>
                    <Input 
                      type="text"
                      value={newFiscalYear}
                      onChange={e => setNewFiscalYear(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Reporting Deadline</label>
                    <Input 
                      type="date"
                      value={newDeadline}
                      onChange={e => setNewDeadline(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Associated Program</label>
                    <select 
                      value={newProgramId}
                      onChange={e => setNewProgramId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="">General Organizational Capacity</option>
                      {programs.map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Notes / Grant Conditions</label>
                  <textarea 
                    rows={2}
                    placeholder="Deliverables, restricted expense criteria, or reporting instructions..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="crimson"
                    size="sm"
                    className="shadow-xs font-semibold"
                  >
                    Save Record
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

