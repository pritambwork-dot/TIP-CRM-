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
  Sparkles,
  Link2,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FundingRecord, FundingStatus, FundingType, DocumentItem } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { OneUiSearchBar } from '../ui/OneUiSearchBar';
import { exportToCsv } from '../../lib/csvExport';
import { validateExternalUrl } from '../../lib/fileValidation';

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
    documents,
    addDocument,
    deleteDocument,
    currentUser,
    isSuperAdmin,
    hasPermission,
    Permissions
  } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FundingStatus | 'All'>('All');

  // Permission evaluations based on Super Admin configurations & dataScope
  const canCreateFunding = isSuperAdmin || 
    currentUser.dataScope?.funding === 'ALL' || 
    hasPermission('funding', 'create') || 
    hasPermission('funding', 'edit');
  const canDeleteFunding = isSuperAdmin || hasPermission('funding', 'delete');
  const canLinkDocuments = isSuperAdmin || 
    hasPermission('documents', 'create') || 
    hasPermission('documents', 'edit');
  const canDeleteDocuments = isSuperAdmin || hasPermission('documents', 'delete');
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

  // Optional initial document attachment state
  const [attachInitialDoc, setAttachInitialDoc] = useState(false);
  const [initialDocTitle, setInitialDocTitle] = useState('');
  const [initialDocUrl, setInitialDocUrl] = useState('');
  const [initialDocType, setInitialDocType] = useState<DocumentItem['type']>('Google Docs');
  const [initialDocUrlError, setInitialDocUrlError] = useState<string | null>(null);

  // Dedicated funding documents & agreements modal state
  const [selectedFundingForDocs, setSelectedFundingForDocs] = useState<FundingRecord | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentItem['type']>('Google Docs');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [newDocUrlError, setNewDocUrlError] = useState<string | null>(null);

  // Access Control: Check administrator-configured data scope and role permissions
  const isFundingRestricted = !isSuperAdmin && (
    currentUser.dataScope?.funding === 'NONE' || 
    !hasPermission('funding', 'view')
  );

  if (isFundingRestricted) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Restricted Data Access</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Financial ledgers and donor contributions are hidden for your account based on administrator data scope configuration.
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

    if (attachInitialDoc && initialDocUrl.trim()) {
      const check = validateExternalUrl(initialDocUrl);
      if (!check.isValid || !check.sanitizedUrl) {
        setInitialDocUrlError(check.error || 'Invalid or insecure document URL.');
        return;
      }
    }

    const programObj = programs.find(p => p.id === newProgramId);

    const createdRecord = addFunding({
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

    if (attachInitialDoc && initialDocUrl.trim() && initialDocTitle.trim()) {
      const check = validateExternalUrl(initialDocUrl);
      addDocument({
        title: initialDocTitle.trim(),
        url: check.sanitizedUrl || initialDocUrl.trim(),
        type: initialDocType,
        relatedType: 'Funding',
        relatedId: createdRecord.id,
        relatedName: createdRecord.funderName || createdRecord.donorOrFunder,
        addedBy: currentUser.name,
        description: `Grant agreement / funder documentation for ${createdRecord.funderName || createdRecord.donorOrFunder}`
      });
    }

    setNewFunderName('');
    setNewNotes('');
    setAttachInitialDoc(false);
    setInitialDocTitle('');
    setInitialDocUrl('');
    setInitialDocUrlError(null);
    setShowAddModal(false);
  };

  const handleLinkFundingDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFundingForDocs || !newDocTitle.trim() || !newDocUrl.trim()) return;

    const check = validateExternalUrl(newDocUrl);
    if (!check.isValid || !check.sanitizedUrl) {
      setNewDocUrlError(check.error || 'Invalid or insecure document URL.');
      return;
    }

    addDocument({
      title: newDocTitle.trim(),
      url: check.sanitizedUrl,
      type: newDocType,
      relatedType: 'Funding',
      relatedId: selectedFundingForDocs.id,
      relatedName: selectedFundingForDocs.funderName || selectedFundingForDocs.donorOrFunder,
      addedBy: currentUser.name,
      description: newDocDescription.trim() || undefined
    });

    setNewDocTitle('');
    setNewDocUrl('');
    setNewDocDescription('');
    setNewDocUrlError(null);
  };

  const handleOpenDoc = (url: string) => {
    const check = validateExternalUrl(url);
    if (check.isValid && check.sanitizedUrl) {
      window.open(check.sanitizedUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert(check.error || 'Insecure URL protocol blocked.');
    }
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

          {canCreateFunding ? (
            <Button
              onClick={() => {
                setShowAddModal(true);
                setAttachInitialDoc(false);
                setInitialDocTitle('');
                setInitialDocUrl('');
                setInitialDocUrlError(null);
              }}
              id="btn-add-funding"
              variant="crimson"
              size="sm"
              className="gap-1.5 text-xs shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add funding</span>
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs opacity-50 cursor-not-allowed"
              title={Permissions.getDisabledReason('funding', 'create')}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Add funding</span>
            </Button>
          )}
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
                <th className="py-3 px-4">Agreements & Docs</th>
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

                    <td className="py-3.5 px-4">
                      {(() => {
                        const linkedDocs = documents.filter(d => 
                          d.relatedType === 'Funding' && 
                          (d.relatedId === item.id || d.relatedName === funder)
                        );
                        return (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFundingForDocs(item);
                                setNewDocUrlError(null);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                                linkedDocs.length > 0
                                  ? 'bg-[#140a8e]/10 text-[#140a8e] hover:bg-[#140a8e]/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                              title={canLinkDocuments ? "View or Link Documents" : "View Linked Documents"}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{linkedDocs.length} {linkedDocs.length === 1 ? 'Doc' : 'Docs'}</span>
                            </button>
                            {canLinkDocuments && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFundingForDocs(item);
                                  setNewDocUrlError(null);
                                }}
                                className="text-[11px] text-[#ea0543] hover:underline font-medium cursor-pointer"
                              >
                                + Link
                              </button>
                            )}
                          </div>
                        );
                      })()}
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

                {/* Optional Grant Agreement / Document Link */}
                <div className="pt-2 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Attach Grant Agreement / Document (Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAttachInitialDoc(!attachInitialDoc)}
                      className="text-xs text-primary font-medium hover:underline cursor-pointer"
                    >
                      {attachInitialDoc ? 'Remove Document' : '+ Attach Document Link'}
                    </button>
                  </div>

                  {attachInitialDoc && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/80 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Document Title</label>
                          <Input
                            type="text"
                            placeholder="e.g. Contribution Agreement 2026"
                            value={initialDocTitle}
                            onChange={e => setInitialDocTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Format</label>
                          <select
                            value={initialDocType}
                            onChange={e => setInitialDocType(e.target.value as any)}
                            className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                          >
                            <option value="Google Docs">Google Docs</option>
                            <option value="Google Sheets">Google Sheets</option>
                            <option value="Google Drive">Google Drive Folder</option>
                            <option value="PDF / File">PDF / File</option>
                            <option value="Cloud Link">Cloud Link</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-foreground mb-1">External URL *</label>
                        <Input
                          type="url"
                          placeholder="https://docs.google.com/document/d/..."
                          value={initialDocUrl}
                          onChange={e => {
                            setInitialDocUrl(e.target.value);
                            if (initialDocUrlError) setInitialDocUrlError(null);
                          }}
                          className={initialDocUrlError ? 'border-rose-500' : ''}
                        />
                        {initialDocUrlError && (
                          <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{initialDocUrlError}</span>
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="crimson"
                    size="sm"
                    className="shadow-xs font-semibold cursor-pointer"
                  >
                    Save Record
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Funding Documents & Agreements Modal */}
      <AnimatePresence>
        {selectedFundingForDocs && (
          <div 
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedFundingForDocs(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#140a8e]" />
                    <span>Funding Agreements & Linked Documents</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedFundingForDocs.funderName || selectedFundingForDocs.donorOrFunder} · ${selectedFundingForDocs.amountCad.toLocaleString('en-CA')} CAD ({selectedFundingForDocs.fiscalYear || '2026-2027'})
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedFundingForDocs(null)} 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Existing Linked Documents List */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                    <span>Linked Documents</span>
                    <Badge variant="outline" className="text-[10px]">
                      {documents.filter(d => d.relatedType === 'Funding' && (d.relatedId === selectedFundingForDocs.id || d.relatedName === (selectedFundingForDocs.funderName || selectedFundingForDocs.donorOrFunder))).length} Total
                    </Badge>
                  </h4>

                  {(() => {
                    const currentDocs = documents.filter(d => 
                      d.relatedType === 'Funding' && 
                      (d.relatedId === selectedFundingForDocs.id || d.relatedName === (selectedFundingForDocs.funderName || selectedFundingForDocs.donorOrFunder))
                    );

                    if (currentDocs.length === 0) {
                      return (
                        <div className="p-6 text-center border border-dashed border-border rounded-xl bg-muted/10">
                          <FileText className="w-6 h-6 text-muted-foreground/60 mx-auto mb-1.5" />
                          <p className="text-xs text-muted-foreground">No documents linked to this funding agreement yet.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {currentDocs.map(doc => (
                          <div 
                            key={doc.id}
                            className="p-3 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                {doc.type.includes('Sheet') ? <FileSpreadsheet className="w-3.5 h-3.5" /> :
                                 doc.type.includes('Drive') ? <FolderOpen className="w-3.5 h-3.5" /> :
                                 <FileText className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{doc.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {doc.type} · Added {doc.addedAt} by {doc.addedBy}
                                </p>
                                {doc.description && (
                                  <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">{doc.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 cursor-pointer"
                                onClick={() => handleOpenDoc(doc.url)}
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </Button>

                              {canDeleteDocuments && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove document link "${doc.title}"?`)) {
                                      deleteDocument(doc.id);
                                    }
                                  }}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                                  title="Remove Document Link"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Link New Document Form (Governed by Super Admin Permissions) */}
                <div className="pt-3 border-t border-border">
                  {canLinkDocuments ? (
                    <form onSubmit={handleLinkFundingDocument} className="space-y-3">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-[#ea0543]" />
                        <span>Link New Document or Agreement</span>
                      </h4>

                      <div>
                        <label className="block text-[11px] font-medium text-foreground mb-1">Document Title *</label>
                        <Input 
                          type="text"
                          required
                          placeholder="e.g. Master Grant Agreement, Budget Spreadsheet"
                          value={newDocTitle}
                          onChange={e => setNewDocTitle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Format</label>
                          <select 
                            value={newDocType}
                            onChange={e => setNewDocType(e.target.value as any)}
                            className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                          >
                            <option value="Google Docs">Google Docs</option>
                            <option value="Google Sheets">Google Sheets</option>
                            <option value="Google Drive">Google Drive Folder</option>
                            <option value="Google Slides">Google Slides</option>
                            <option value="PDF / File">PDF / File</option>
                            <option value="Cloud Link">Cloud Link</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-foreground mb-1">Description (Optional)</label>
                          <Input 
                            type="text"
                            placeholder="e.g. Signed contract and disbursement terms"
                            value={newDocDescription}
                            onChange={e => setNewDocDescription(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-foreground mb-1">Google Drive or External URL *</label>
                        <Input 
                          type="url"
                          required
                          placeholder="https://docs.google.com/document/d/... or cloud storage URL"
                          value={newDocUrl}
                          onChange={e => {
                            setNewDocUrl(e.target.value);
                            if (newDocUrlError) setNewDocUrlError(null);
                          }}
                          className={newDocUrlError ? 'border-rose-500' : ''}
                        />
                        {newDocUrlError && (
                          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{newDocUrlError}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          variant="crimson"
                          size="sm"
                          className="shadow-xs font-semibold cursor-pointer gap-1.5"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Link Document</span>
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold">Document Linking Restricted</p>
                        <p className="text-muted-foreground mt-0.5">
                          Only users granted document creation or edit permissions by the Super Administrator can link new files to funding agreements.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

