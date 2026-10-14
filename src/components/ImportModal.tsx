import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../context/CrmContext';
import { Person } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { clientSafeLogger, mapToSafeErrorMessage } from '../lib/safeErrors';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { people, addPerson, updatePerson } = useCrm();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'all'>('skip');

  // Sample parsed records from uploaded sheet
  const sampleImportRows = [
    { name: 'Dr. Tariq Mansoor', email: 'tmansoor@globaldialogue.org', org: 'Centre for Global Dialogue', role: 'Executive Director', type: 'Partner', phone: '+1 (416) 555-0812' },
    { name: 'Chloe Bergeron', email: 'chloe.b@montrealinclusion.ca', org: 'Montreal Inclusion Collective', role: 'Lead Researcher', type: 'Advisor', phone: '+1 (514) 555-0994' },
    { name: 'Maya Lin', email: 'maya.lin@innovateyouth.org', org: 'Youth Innovation Lab', role: 'Program Director', type: 'Partner', phone: '+1 (416) 555-0142' },
    { name: 'Kiran Sharma', email: 'kiran.s@calgarycivic.org', org: 'Calgary Civic Action', role: 'Youth Liaison', type: 'Participant', phone: '+1 (403) 555-0321' }
  ];

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

  const handleExecuteImport = () => {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    sampleImportRows.forEach((row, idx) => {
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
            relationshipTypes: [row.type as any],
            interests: ['Civic Engagement'],
            programIds: [],
            eventIds: []
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={onClose}
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
                <p className="text-xs text-muted-foreground">Fast, forgiving import with duplicate detection</p>
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
              {/* STEP 1: Upload */}
              {step === 'upload' && (
                <div className="space-y-4 text-center">
                  <div 
                    onClick={() => setStep('mapping')}
                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Upload CSV or Excel file</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Drag and drop your spreadsheet here, or click to load a sample roster.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs">
                      <span>Choose file (.csv, .xlsx)</span>
                    </div>
                  </div>

                  <div className="text-left text-xs text-muted-foreground bg-muted/30 p-3.5 rounded-lg border border-border">
                    <span className="font-semibold text-foreground">Supported columns:</span> First Name, Last Name, Email, Organization, Role, Phone, Relationship Category.
                  </div>
                </div>
              )}

              {/* STEP 2: Mapping & Duplicate Resolution */}
              {step === 'mapping' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Roster_Export_2026.csv (4 detected contacts)</span>
                  </div>

                  {/* Duplicate Strategy */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Duplicate Strategy (Matches by Email)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      1 contact in this file already exists in TIP CRM (Maya Lin, maya.lin@innovateyouth.org).
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
                  <Card className="border border-border rounded-lg overflow-hidden text-xs">
                    <div className="p-2 bg-muted/40 font-semibold text-[11px] text-muted-foreground border-b border-border">
                      Preview (First 4 rows)
                    </div>
                    <div className="divide-y divide-border max-h-40 overflow-y-auto">
                      {sampleImportRows.map((r, i) => (
                        <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-foreground">{r.name}</p>
                            <p className="text-muted-foreground text-[11px]">{r.email} • {r.org}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {r.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('upload')}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      &larr; Back
                    </Button>
                    <Button
                      variant="crimson"
                      size="sm"
                      onClick={handleExecuteImport}
                      className="font-semibold shadow-xs text-xs"
                    >
                      Confirm & Import (4 Contacts)
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Complete */}
              {step === 'complete' && (
                <div className="space-y-5 text-center py-4">
                  <div className={`w-12 h-12 rounded-full ${importResults.failed > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'} flex items-center justify-center mx-auto`}>
                    {importResults.failed > 0 ? (
                      <AlertTriangle className="w-7 h-7" />
                    ) : (
                      <CheckCircle2 className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-foreground">
                      {importResults.failed > 0 ? 'Import Processed with Notices' : 'Import Completed Successfully'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {importResults.failed > 0
                        ? `${importResults.imported + importResults.updated} records processed, ${importResults.failed} row(s) flagged.`
                        : 'Your directory has been synchronized with the spreadsheet.'}
                    </p>
                  </div>

                  <div className={`grid ${importResults.failed > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-3 p-4 bg-muted/30 rounded-xl border border-border text-center text-xs`}>
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
                      <div className="text-muted-foreground text-[11px]">Skipped</div>
                    </div>
                    {importResults.failed > 0 && (
                      <div>
                        <div className="text-lg font-bold text-destructive">{importResults.failed}</div>
                        <div className="text-muted-foreground text-[11px]">Errors</div>
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

                  <Button
                    variant="crimson"
                    onClick={onClose}
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

