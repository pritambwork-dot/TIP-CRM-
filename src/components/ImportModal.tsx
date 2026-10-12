import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ImportContactRow {
  name: string;
  email: string;
  org: string;
  role: string;
  type: string;
  phone: string;
}

// Formula injection protection (RFC 4180 / OWASP CSV Injection prevention)
export function sanitizeCsvValue(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  // Strip or quote leading formula triggers (=, +, -, @)
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
    const rowObj: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      rowObj[h] = sanitizeCsvValue(vals[idx] || '');
    });
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

const DEFAULT_SAMPLE_ROWS: ImportContactRow[] = [
  { name: 'Dr. Tariq Mansoor', email: 'tmansoor@globaldialogue.org', org: 'Centre for Global Dialogue', role: 'Executive Director', type: 'Partner', phone: '+1 (416) 555-0812' },
  { name: 'Chloe Bergeron', email: 'chloe.b@montrealinclusion.ca', org: 'Montreal Inclusion Collective', role: 'Lead Researcher', type: 'Advisor', phone: '+1 (514) 555-0994' },
  { name: 'Maya Lin', email: 'maya.lin@innovateyouth.org', org: 'Youth Innovation Lab', role: 'Program Director', type: 'Partner', phone: '+1 (416) 555-0142' },
  { name: 'Kiran Sharma', email: 'kiran.s@calgarycivic.org', org: 'Calgary Civic Action', role: 'Youth Liaison', type: 'Participant', phone: '+1 (403) 555-0321' }
];

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { people, addPerson, updatePerson, hasPermission } = useCrm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canImport = hasPermission('people', 'import');

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'all'>('skip');
  const [fileName, setFileName] = useState<string>('Roster_Sample.csv');
  const [importRows, setImportRows] = useState<ImportContactRow[]>(DEFAULT_SAMPLE_ROWS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [importResults, setImportResults] = useState<{ imported: number; updated: number; skipped: number }>({
    imported: 0,
    updated: 0,
    skipped: 0
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canImport) {
      setErrorMessage('Permission denied: You do not have permission to import contact records.');
      return;
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!isCsv) {
      setErrorMessage('Invalid file format: Only .csv files are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const { rows } = parseCsv(content);
        if (rows.length === 0) {
          setErrorMessage('The uploaded CSV file is empty or has no readable rows.');
          return;
        }

        const parsedContacts: ImportContactRow[] = rows.map(r => {
          const nameVal = r['Name'] || r['Full Name'] || r['Full name'] || r['name'] || 
            `${r['First Name'] || r['First name'] || ''} ${r['Last Name'] || r['Last name'] || ''}`.trim() || 'Unnamed Contact';
          
          const emailKey = Object.keys(r).find(k => k.toLowerCase().includes('email')) || 'Email';
          const emailVal = r[emailKey] || `contact_${Math.random().toString(36).substring(2, 7)}@example.org`;

          const orgKey = Object.keys(r).find(k => k.toLowerCase().includes('org')) || 'Organization';
          const orgVal = r[orgKey] || '';

          const roleKey = Object.keys(r).find(k => k.toLowerCase().includes('role') || k.toLowerCase().includes('title')) || 'Role';
          const roleVal = r[roleKey] || 'Participant';

          const phoneKey = Object.keys(r).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile')) || 'Phone';
          const phoneVal = r[phoneKey] || '';

          const typeKey = Object.keys(r).find(k => k.toLowerCase().includes('type') || k.toLowerCase().includes('category') || k.toLowerCase().includes('relationship')) || 'Type';
          const typeVal = r[typeKey] || 'Participant';

          return {
            name: nameVal,
            email: emailVal,
            org: orgVal,
            role: roleVal,
            phone: phoneVal,
            type: typeVal
          };
        });

        setImportRows(parsedContacts);
        setErrorMessage(null);
        setStep('mapping');
      } catch (err) {
        setErrorMessage('Failed to parse CSV file. Ensure standard comma-separated values.');
      }
    };
    reader.readAsText(file);
  };

  const handleUseSample = () => {
    setFileName('Sample_Roster_Contacts.csv');
    setImportRows(DEFAULT_SAMPLE_ROWS);
    setErrorMessage(null);
    setStep('mapping');
  };

  const duplicatesCount = importRows.filter(r => 
    people.some(p => p.email.toLowerCase() === r.email.toLowerCase())
  ).length;

  const handleExecuteImport = () => {
    if (!canImport) {
      setErrorMessage('Permission denied: Import operation restricted to authorized staff.');
      return;
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    importRows.forEach(row => {
      const existing = people.find(p => p.email.toLowerCase() === row.email.toLowerCase());

      if (existing) {
        if (duplicateStrategy === 'skip') {
          skipped++;
        } else if (duplicateStrategy === 'update') {
          updatePerson(existing.id, {
            name: row.name,
            organizationName: row.org,
            role: row.role,
            phone: row.phone
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
            relationshipTypes: [row.type as any],
            interests: ['Civic Engagement'],
            programIds: [],
            eventIds: []
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
          relationshipTypes: [row.type as any],
          interests: ['Civic Engagement'],
          programIds: [],
          eventIds: []
        });
        imported++;
      }
    });

    setImportResults({ imported, updated, skipped });
    setStep('complete');
  };

  const resetAndClose = () => {
    setStep('upload');
    setErrorMessage(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={resetAndClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="text-base font-serif font-bold text-foreground">Import Contacts into TIP CRM</h3>
                <p className="text-xs text-muted-foreground">Fast, secure CSV import with formula sanitization & duplicate detection</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={resetAndClose} 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              {/* STEP 1: Upload */}
              {step === 'upload' && (
                <div className="space-y-4 text-center">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    className="hidden" 
                    onChange={handleFileChange}
                  />

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Upload CSV spreadsheet</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Click to browse your computer or drag your file here. Maximum 5 MB.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs">
                      <span>Choose .csv file</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-left">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleUseSample}
                      className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Or test with sample community roster</span>
                    </button>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Formula injection sanitized
                    </span>
                  </div>

                  <div className="text-left text-xs text-muted-foreground bg-muted/30 p-3.5 rounded-lg border border-border">
                    <span className="font-semibold text-foreground">Supported column headers:</span> Name / First Name + Last Name, Email, Organization, Role, Phone, Relationship Category.
                  </div>
                </div>
              )}

              {/* STEP 2: Mapping & Duplicate Resolution */}
              {step === 'mapping' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>{fileName} ({importRows.length} contacts found)</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                      Sanitized
                    </Badge>
                  </div>

                  {/* Duplicate Strategy */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Duplicate Resolution Strategy</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {duplicatesCount > 0 
                        ? `${duplicatesCount} contact(s) match existing emails already in TIP CRM.`
                        : 'No existing email collisions detected in this batch.'
                      }
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('skip')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          duplicateStrategy === 'skip' ? 'bg-[#ea0543] text-white shadow-xs' : 'bg-card text-foreground border border-border hover:bg-muted/50'
                        }`}
                      >
                        Skip Duplicates (Default)
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
                  <Card className="border border-border rounded-lg overflow-hidden text-xs">
                    <div className="p-2 bg-muted/40 font-semibold text-[11px] text-muted-foreground border-b border-border flex items-center justify-between">
                      <span>Preview (Showing {Math.min(importRows.length, 5)} rows)</span>
                      <span>Total: {importRows.length}</span>
                    </div>
                    <div className="divide-y divide-border max-h-44 overflow-y-auto">
                      {importRows.slice(0, 5).map((r, i) => {
                        const isDup = people.some(p => p.email.toLowerCase() === r.email.toLowerCase());
                        return (
                          <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground">{r.name}</p>
                                {isDup && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                                    Existing
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground text-[11px]">{r.email} • {r.org || 'No org'}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {r.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('upload')}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      &larr; Choose different file
                    </Button>
                    <Button
                      variant="crimson"
                      size="sm"
                      onClick={handleExecuteImport}
                      className="font-semibold shadow-xs text-xs"
                    >
                      Confirm & Import ({importRows.length} Contacts)
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Complete */}
              {step === 'complete' && (
                <div className="space-y-5 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-foreground">Import Completed Successfully</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your directory has been synchronized and protected against spreadsheet formula injections.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border border-border text-center text-xs">
                    <div>
                      <div className="text-lg font-bold text-foreground">{importResults.imported}</div>
                      <div className="text-muted-foreground text-[11px]">New added</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{importResults.updated}</div>
                      <div className="text-muted-foreground text-[11px]">Updated</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{importResults.skipped}</div>
                      <div className="text-muted-foreground text-[11px]">Duplicates skipped</div>
                    </div>
                  </div>

                  <Button
                    variant="crimson"
                    onClick={resetAndClose}
                    className="w-full py-2.5 font-semibold text-xs shadow-xs"
                  >
                    Return to Directory
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
