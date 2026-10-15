import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  FolderOpen,
  Folder,
  Link as LinkIcon,
  Download,
  FileText,
  CloudDownload,
  Check,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { Person, RelationshipType } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { clientSafeLogger, mapToSafeErrorMessage } from '../lib/safeErrors';
import { 
  ParsedContactRow, 
  parseRawContactsCsv, 
  SAMPLE_CSV_CONTENT, 
  GOOGLE_DRIVE_PRESETS 
} from '../lib/contactsImporter';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { people, addPerson, updatePerson } = useCrm();
  const [sourceTab, setSourceTab] = useState<'csv' | 'gdrive'>('csv');
  const [step, setStep] = useState<'upload' | 'mapping' | 'complete'>('upload');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'all'>('skip');

  // Active dataset state
  const [datasetSourceLabel, setDatasetSourceLabel] = useState<string>('Roster_Export_2026.csv');
  const [parsedRows, setParsedRows] = useState<ParsedContactRow[]>([]);
  const [isProcessingSource, setIsProcessingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  // Google Drive custom URL input
  const [googleUrl, setGoogleUrl] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gdrive-folder-partners');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute duplicate matches based on parsedRows
  const duplicateRows = parsedRows.filter(row => 
    row.email && people.some(p => p.email.toLowerCase() === row.email.toLowerCase())
  );

  const [importResults, setImportResults] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }>({
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceError(null);
    setIsProcessingSource(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          setSourceError('Selected file appears to be empty.');
          setIsProcessingSource(false);
          return;
        }

        const rows = parseRawContactsCsv(text);
        if (rows.length === 0) {
          setSourceError('No valid contact records found. Please ensure headers include Name and Email.');
          setIsProcessingSource(false);
          return;
        }

        setDatasetSourceLabel(`${file.name} (${rows.length} contacts)`);
        setParsedRows(rows);
        setIsProcessingSource(false);
        setStep('mapping');
      } catch (err: any) {
        const msg = mapToSafeErrorMessage(err, 'Failed to parse CSV file.');
        setSourceError(msg);
        setIsProcessingSource(false);
      }
    };
    reader.onerror = () => {
      setSourceError('Error reading file from disk.');
      setIsProcessingSource(false);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    setSourceError(null);
    const rows = parseRawContactsCsv(SAMPLE_CSV_CONTENT);
    setDatasetSourceLabel(`TIP_Sample_Partners_Roster.csv (${rows.length} contacts)`);
    setParsedRows(rows);
    setStep('mapping');
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TIP_Contacts_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConnectGoogleDrive = () => {
    setSourceError(null);
    setIsProcessingSource(true);

    // If custom URL is provided, detect type
    if (googleUrl.trim()) {
      const trimmed = googleUrl.trim();
      const isSheet = trimmed.includes('docs.google.com/spreadsheets');
      const isFolder = trimmed.includes('drive.google.com/drive/folders');

      if (!isSheet && !isFolder && !trimmed.startsWith('https://')) {
        setSourceError('Please enter a valid Google Drive folder URL or Google Sheets link.');
        setIsProcessingSource(false);
        return;
      }

      // Extract ID or simulate connection
      setTimeout(() => {
        setIsProcessingSource(false);
        const sourceName = isSheet ? 'Google Sheets Roster' : 'Google Drive Folder Contacts';
        const rows = parseRawContactsCsv(SAMPLE_CSV_CONTENT);
        setDatasetSourceLabel(`Google Drive: ${sourceName} (${rows.length} contacts)`);
        setParsedRows(rows);
        setStep('mapping');
      }, 500);
      return;
    }

    // Load from selected preset
    const preset = GOOGLE_DRIVE_PRESETS.find(p => p.id === selectedPresetId) || GOOGLE_DRIVE_PRESETS[0];
    setTimeout(() => {
      setIsProcessingSource(false);
      const rows = parseRawContactsCsv(preset.csvData);
      setDatasetSourceLabel(`${preset.name}: ${preset.fileName} (${rows.length} contacts)`);
      setParsedRows(rows);
      setStep('mapping');
    }, 400);
  };

  const handleExecuteImport = () => {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    parsedRows.forEach((row, idx) => {
      try {
        if (!row.name?.trim() || !row.email?.trim()) {
          failed++;
          errors.push(`Row ${idx + 1}: Missing name or email.`);
          return;
        }

        const existing = people.find(p => p.email.toLowerCase() === row.email.toLowerCase());

        if (existing) {
          if (duplicateStrategy === 'skip') {
            skipped++;
          } else if (duplicateStrategy === 'update') {
            updatePerson(existing.id, {
              name: row.name,
              organizationName: row.org,
              role: row.role,
              phone: row.phone || existing.phone,
              city: row.city || existing.city,
              notes: row.notes || existing.notes
            });
            updated++;
          } else {
            // Import anyway
            addPerson({
              name: row.name,
              email: row.email,
              organizationName: row.org,
              role: row.role,
              phone: row.phone,
              city: row.city,
              relationshipTypes: [row.type],
              interests: ['Civic Engagement'],
              programIds: [],
              eventIds: [],
              notes: row.notes
            });
            imported++;
          }
        } else {
          addPerson({
            name: row.name,
            email: row.email,
            organizationName: row.org,
            role: row.role,
            phone: row.phone,
            city: row.city,
            relationshipTypes: [row.type],
            interests: ['Civic Engagement'],
            programIds: [],
            eventIds: [],
            notes: row.notes
          });
          imported++;
        }
      } catch (err: any) {
        failed++;
        const safeReason = mapToSafeErrorMessage(err, `Failed to process record for ${row.name || 'row ' + (idx + 1)}.`);
        clientSafeLogger.warn(`[ImportModal] Row ${idx + 1} error:`, safeReason);
        errors.push(`Row ${idx + 1}: ${safeReason}`);
      }
    });

    setImportResults({ imported, updated, skipped, failed, errors });
    setStep('complete');
  };

  const handleReset = () => {
    setStep('upload');
    setParsedRows([]);
    setSourceError(null);
    setGoogleUrl('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden my-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <CloudDownload className="w-5 h-5 text-[#ea0543]" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-foreground">Import Contacts into TIP CRM</h3>
                  <p className="text-xs text-muted-foreground">Import from CSV / spreadsheet file or connect directly to Google Drive</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              {/* STEP 1: Source Selection (CSV vs Google Drive) */}
              {step === 'upload' && (
                <div className="space-y-5">
                  {/* Source Toggle Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl border border-border/80">
                    <button
                      type="button"
                      onClick={() => { setSourceTab('csv'); setSourceError(null); }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        sourceTab === 'csv'
                          ? 'bg-card text-foreground shadow-xs border border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Upload CSV / Spreadsheet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSourceTab('gdrive'); setSourceError(null); }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        sourceTab === 'gdrive'
                          ? 'bg-card text-foreground shadow-xs border border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 text-amber-500" />
                      <span>Google Drive / Folder</span>
                    </button>
                  </div>

                  {sourceError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{sourceError}</span>
                    </div>
                  )}

                  {/* TAB A: CSV File Upload */}
                  {sourceTab === 'csv' && (
                    <div className="space-y-4">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".csv,.tsv,.txt" 
                        className="hidden" 
                      />

                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-8 cursor-pointer transition-all bg-muted/20 hover:bg-muted/40 text-center group"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">Click to upload or drag & drop CSV</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                          Supports comma-separated (.csv) and tab-delimited (.tsv) files exported from Excel, Google Sheets, or Apple Numbers.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs">
                          <span>Browse CSV file on device</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
                        <button
                          type="button"
                          onClick={handleLoadSampleCsv}
                          className="text-[#ea0543] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Load Sample Community Partners CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download blank CSV template</span>
                        </button>
                      </div>

                      <div className="text-left text-xs text-muted-foreground bg-muted/30 p-3.5 rounded-xl border border-border leading-relaxed">
                        <span className="font-semibold text-foreground">Auto-detected columns:</span> Name (or First/Last), Email, Organization, Role / Title, Phone Number, Relationship Type, City, and Notes.
                      </div>
                    </div>
                  )}

                  {/* TAB B: Google Drive / Google Folder */}
                  {sourceTab === 'gdrive' && (
                    <div className="space-y-4">
                      {/* Google Drive Link Form */}
                      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                          <FolderOpen className="w-4 h-4 text-amber-600" />
                          <span>Import from Google Drive Folder or Google Sheet</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Paste a shared Google Drive folder URL or a Google Sheets roster link to import contacts directly without downloading.
                        </p>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                              type="url"
                              value={googleUrl}
                              onChange={(e) => setGoogleUrl(e.target.value)}
                              placeholder="https://drive.google.com/drive/folders/... or docs.google.com/spreadsheets/d/..."
                              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleConnectGoogleDrive}
                            disabled={isProcessingSource}
                            variant="crimson"
                            className="text-xs shrink-0 font-semibold"
                          >
                            {isProcessingSource ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            )}
                            <span>Connect & Fetch</span>
                          </Button>
                        </div>
                      </div>

                      {/* Quick Select Curated Google Drive Folders */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">
                          Or select a shared Google Drive roster folder:
                        </label>

                        <div className="grid grid-cols-1 gap-2.5">
                          {GOOGLE_DRIVE_PRESETS.map((preset) => (
                            <div 
                              key={preset.id}
                              onClick={() => setSelectedPresetId(preset.id)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                                selectedPresetId === preset.id
                                  ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                                  : 'bg-card border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  preset.type === 'sheet' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {preset.type === 'sheet' ? <FileSpreadsheet className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{preset.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{preset.fileName} • {preset.contactsCount} contacts</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                  {preset.type === 'sheet' ? 'Sheets' : 'Drive Folder'}
                                </Badge>
                                {selectedPresetId === preset.id && (
                                  <div className="w-5 h-5 rounded-full bg-[#ea0543] text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          onClick={handleConnectGoogleDrive}
                          disabled={isProcessingSource}
                          variant="crimson"
                          className="w-full sm:w-auto font-semibold text-xs shadow-xs"
                        >
                          <span>Load Contacts from Selected Google Folder</span>
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Mapping, Duplicate Strategy & Preview */}
              {step === 'mapping' && (
                <div className="space-y-5">
                  {/* Source indicator */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-foreground">{datasetSourceLabel}</span>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {parsedRows.length} contacts detected
                    </Badge>
                  </div>

                  {/* Duplicate Strategy */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    duplicateRows.length > 0 
                      ? 'bg-amber-500/10 border-amber-500/25' 
                      : 'bg-muted/30 border-border'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <AlertTriangle className={`w-4 h-4 ${duplicateRows.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                      <span>Duplicate Resolution Strategy (Matches by Email)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {duplicateRows.length > 0 
                        ? `${duplicateRows.length} contact(s) in this file already exist in TIP CRM (${duplicateRows.map(d => d.email).slice(0, 2).join(', ')}${duplicateRows.length > 2 ? '...' : ''}).`
                        : 'No existing email matches found. All records will be imported as fresh contacts.'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('skip')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          duplicateStrategy === 'skip' ? 'bg-[#ea0543] text-white shadow-xs' : 'bg-card text-foreground border border-border hover:bg-muted/50'
                        }`}
                      >
                        Skip Duplicates (Recommended)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('update')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          duplicateStrategy === 'update' ? 'bg-[#ea0543] text-white shadow-xs' : 'bg-card text-foreground border border-border hover:bg-muted/50'
                        }`}
                      >
                        Update Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          duplicateStrategy === 'all' ? 'bg-[#ea0543] text-white shadow-xs' : 'bg-card text-foreground border border-border hover:bg-muted/50'
                        }`}
                      >
                        Import Anyway
                      </button>
                    </div>
                  </div>

                  {/* Table Preview */}
                  <Card className="border border-border rounded-xl overflow-hidden text-xs">
                    <div className="p-2.5 bg-muted/40 font-semibold text-[11px] text-muted-foreground border-b border-border flex items-center justify-between">
                      <span>Parsed Contact Roster Preview ({parsedRows.length} rows)</span>
                      <span>Showing first {Math.min(parsedRows.length, 6)} rows</span>
                    </div>
                    <div className="divide-y divide-border max-h-52 overflow-y-auto">
                      {parsedRows.slice(0, 8).map((r, i) => {
                        const isDup = people.some(p => p.email.toLowerCase() === r.email.toLowerCase());
                        return (
                          <div key={i} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{r.name}</span>
                                {isDup && (
                                  <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300">
                                    Existing Match
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-[11px]">
                                {r.email} • {r.org} {r.role ? `(${r.role})` : ''} {r.phone ? `• ${r.phone}` : ''}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                              {r.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('upload')}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      &larr; Choose Different File / Folder
                    </Button>
                    <Button
                      variant="crimson"
                      size="sm"
                      onClick={handleExecuteImport}
                      className="font-semibold shadow-xs text-xs cursor-pointer"
                    >
                      <span>Confirm & Import ({parsedRows.length} Contacts)</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Complete */}
              {step === 'complete' && (
                <div className="space-y-5 text-center py-4">
                  <div className={`w-14 h-14 rounded-full ${
                    importResults.failed > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                  } flex items-center justify-center mx-auto`}>
                    {importResults.failed > 0 ? (
                      <AlertTriangle className="w-8 h-8" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-foreground">
                      {importResults.failed > 0 ? 'Import Completed with Notices' : 'Contacts Imported Successfully'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {importResults.failed > 0
                        ? `${importResults.imported + importResults.updated} records processed, ${importResults.failed} row(s) flagged.`
                        : 'Your People Directory has been synchronized.'}
                    </p>
                  </div>

                  <div className={`grid ${importResults.failed > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-3 p-4 bg-muted/30 rounded-xl border border-border text-center text-xs`}>
                    <div>
                      <div className="text-xl font-bold text-foreground">{importResults.imported}</div>
                      <div className="text-muted-foreground text-[11px]">New Added</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{importResults.updated}</div>
                      <div className="text-muted-foreground text-[11px]">Updated</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{importResults.skipped}</div>
                      <div className="text-muted-foreground text-[11px]">Skipped</div>
                    </div>
                    {importResults.failed > 0 && (
                      <div>
                        <div className="text-xl font-bold text-destructive">{importResults.failed}</div>
                        <div className="text-muted-foreground text-[11px]">Flagged Errors</div>
                      </div>
                    )}
                  </div>

                  {importResults.errors.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-left text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-semibold">Row Issues Encountered:</div>
                      {importResults.errors.map((err, i) => (
                        <div key={i} className="text-[11px] font-mono">• {err}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      <span>Import Another File / Folder</span>
                    </Button>

                    <Button
                      variant="crimson"
                      onClick={onClose}
                      className="flex-1 py-2 text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <span>Return to People Directory</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
