import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  ExternalLink, 
  Calendar, 
  Filter, 
  FolderOpen,
  FileSpreadsheet,
  FileCode,
  Tag,
  Lock,
  X,
  Trash2,
  UploadCloud,
  ShieldCheck,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { OneUiSearchBar } from '../ui/OneUiSearchBar';
import { 
  validateExternalUrl, 
  validateUploadFile, 
  sanitizeFilename, 
  MAX_DOCUMENT_SIZE_BYTES 
} from '../../lib/fileValidation';

export const DocumentsView: React.FC = () => {
  const { 
    documents, 
    addDocument, 
    deleteDocument, 
    funding,
    programs,
    events,
    people,
    currentUser, 
    hasPermission, 
    isSuperAdmin, 
    Permissions 
  } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const canCreateDoc = hasPermission('documents', 'create');
  const canDeleteDoc = isSuperAdmin || hasPermission('documents', 'delete');

  // Add document modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'link' | 'upload'>('link');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<DocumentItem['type']>('Google Docs');
  const [newRelatedType, setNewRelatedType] = useState<DocumentItem['relatedType']>('Program');
  const [newRelatedId, setNewRelatedId] = useState('');
  const [newRelatedName, setNewRelatedName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredDocs = documents.filter(doc => {
    const matchesType = selectedType === 'All' ? true : doc.type === selectedType;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true :
      doc.title.toLowerCase().includes(q) ||
      (doc.relatedName && doc.relatedName.toLowerCase().includes(q)) ||
      (doc.description && doc.description.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    try {
      const slice = file.slice(0, 1024);
      const buffer = new Uint8Array(await slice.arrayBuffer());
      const validation = validateUploadFile({
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        buffer
      });

      if (!validation.valid) {
        setFileError(validation.error || 'Invalid file.');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      if (!newTitle.trim()) {
        const base = file.name.replace(/\.[^/.]+$/, '');
        setNewTitle(base.replace(/[-_]/g, ' '));
      }
    } catch {
      setFileError('Failed to read file for binary validation.');
      setSelectedFile(null);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    setFileError(null);

    if (modalMode === 'link') {
      if (!newTitle.trim() || !newUrl.trim()) return;

      const urlValidation = validateExternalUrl(newUrl);
      if (!urlValidation.isValid || !urlValidation.sanitizedUrl) {
        setUrlError(urlValidation.error || 'Invalid or insecure URL protocol. Only HTTP and HTTPS are permitted.');
        return;
      }

      addDocument({
        title: newTitle.trim(),
        url: urlValidation.sanitizedUrl,
        type: newType,
        relatedType: newRelatedType,
        relatedId: newRelatedId || undefined,
        relatedName: newRelatedName.trim() || undefined,
        addedBy: currentUser.name,
        description: newDescription.trim() || undefined
      });

      resetModal();
    } else {
      // File upload mode
      if (!selectedFile) {
        setFileError('Please select a file to upload.');
        return;
      }

      setIsUploading(true);
      try {
        const slice = selectedFile.slice(0, 1024);
        const buffer = new Uint8Array(await slice.arrayBuffer());
        const validation = validateUploadFile({
          filename: selectedFile.name,
          sizeBytes: selectedFile.size,
          mimeType: selectedFile.type,
          buffer
        });

        if (!validation.valid) {
          setFileError(validation.error || 'File validation failed.');
          setIsUploading(false);
          return;
        }

        // Try server validation endpoint if available
        let storageKey = `crm_documents/org-tip/${Date.now()}-${sanitizeFilename(selectedFile.name)}`;
        try {
          const res = await fetch('/api/storage/validate-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: selectedFile.name,
              sizeBytes: selectedFile.size,
              mimeType: selectedFile.type,
              bucket: 'crm_documents',
              userId: currentUser.id
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.storageKey) storageKey = data.storageKey;
          }
        } catch {
          // Fallback to local storageKey
        }

        addDocument({
          title: newTitle.trim() || sanitizeFilename(selectedFile.name),
          url: '',
          type: 'PDF / File',
          relatedType: newRelatedType,
          relatedId: newRelatedId || undefined,
          relatedName: newRelatedName.trim() || undefined,
          addedBy: currentUser.name,
          description: newDescription.trim() || `Uploaded document (${(selectedFile.size / 1024).toFixed(0)} KB)`,
          storageKey,
          isCloudFile: true,
          sizeBytes: selectedFile.size,
          mimeType: selectedFile.type || 'application/octet-stream'
        });

        resetModal();
      } catch {
        setFileError('Unexpected error during file upload.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetModal = () => {
    setNewTitle('');
    setNewUrl('');
    setNewRelatedName('');
    setNewRelatedId('');
    setNewDescription('');
    setSelectedFile(null);
    setUrlError(null);
    setFileError(null);
    setShowAddModal(false);
  };

  const handleOpenDocument = async (doc: DocumentItem) => {
    if (doc.storageKey) {
      try {
        setDownloadingDocId(doc.id);
        const res = await fetch('/api/storage/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storageKey: doc.storageKey,
            userId: currentUser.id,
            ttlSeconds: 900
          })
        });
        const data = await res.json();
        if (data.signedUrl) {
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } else {
          alert(data.error || 'Failed to generate signed download link.');
        }
      } catch {
        alert('Network error while requesting signed file access.');
      } finally {
        setDownloadingDocId(null);
      }
    } else if (doc.url) {
      const check = validateExternalUrl(doc.url);
      if (check.isValid && check.sanitizedUrl) {
        window.open(check.sanitizedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert(check.error || 'Insecure or invalid document URL blocked.');
      }
    }
  };

  const docTypes = ['All', 'Google Docs', 'Google Sheets', 'Google Drive', 'Google Slides', 'PDF / File', 'Cloud Link'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Documents & Sovereign Cloud Storage</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Connect live Google Docs, Sheets, Drive folders, or upload verified files to private encrypted storage with expiring signed URLs.
          </p>
        </div>

        {canCreateDoc ? (
          <Button
            onClick={() => setShowAddModal(true)}
            id="btn-attach-document"
            variant="crimson"
            size="sm"
            className="gap-2 text-xs shadow-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Attach or Upload Document</span>
          </Button>
        ) : (
          <Button
            disabled
            variant="outline"
            size="sm"
            id="btn-attach-document-disabled"
            title={Permissions.getDisabledReason('documents', 'create')}
            className="gap-2 text-xs cursor-not-allowed opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>Attach or Upload Document</span>
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <OneUiSearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search documents by title, attached program, or note..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {docTypes.map(t => {
            const isSelected = selectedType === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white font-semibold'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="docTypeActive"
                    className="absolute inset-0 bg-[#ea0543] rounded-full"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <span className="relative z-10">{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc, index) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.25) }}
            whileHover={{ y: -3 }}
          >
            <Card
              className="p-5 bg-card border-border hover:border-border/80 hover:shadow-md transition-all flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.type}
                    </Badge>
                    {doc.storageKey && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Signed Storage
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{doc.addedAt}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenDocument(doc)}
                  disabled={downloadingDocId === doc.id}
                  className="font-bold text-foreground hover:text-primary hover:underline flex items-start justify-between gap-2 group text-sm text-left w-full cursor-pointer"
                >
                  <span className="line-clamp-2">{doc.title}</span>
                  {downloadingDocId === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0 mt-0.5" />
                  ) : doc.storageKey ? (
                    <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                  )}
                </button>

                {doc.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {doc.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {doc.relatedName ? `${doc.relatedType}: ${doc.relatedName}` : doc.relatedType}
                </span>

                <div className="flex items-center gap-2">
                  <span>By {doc.addedBy}</span>
                  {canDeleteDoc && (
                    <button
                      type="button"
                      title="Delete document reference"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to remove "${doc.title}"?`)) {
                          deleteDocument(doc.id);
                        }
                      }}
                      className="text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer p-0.5 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Document Link or File Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={resetModal}
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
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Attach Document</h3>
                  <div className="flex rounded-lg bg-muted p-0.5 border border-border">
                    <button
                      type="button"
                      onClick={() => setModalMode('link')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        modalMode === 'link' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      External URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode('upload')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        modalMode === 'upload' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Upload File
                    </button>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={resetModal} 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateDocument} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Document Title *</label>
                  <Input 
                    type="text"
                    required
                    placeholder="e.g. Q3 Board Governance Packet"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </div>

                {modalMode === 'link' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Google Drive or External URL *</label>
                    <Input 
                      type="url"
                      required
                      placeholder="https://docs.google.com/document/d/..."
                      value={newUrl}
                      onChange={e => {
                        setNewUrl(e.target.value);
                        if (urlError) setUrlError(null);
                      }}
                      className={urlError ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                    />
                    {urlError && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{urlError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Select File to Upload (Max 10MB) *
                    </label>
                    <input 
                      type="file"
                      required
                      accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Permitted formats: PDF, Word (.docx), Excel (.xlsx), CSV, TXT, PNG, JPEG, WEBP.
                    </p>
                    {fileError && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fileError}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Document Format</label>
                    {modalMode === 'link' ? (
                      <select 
                        value={newType}
                        onChange={e => setNewType(e.target.value as any)}
                        className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                      >
                        <option value="Google Docs">Google Docs</option>
                        <option value="Google Sheets">Google Sheets</option>
                        <option value="Google Drive">Google Drive Folder</option>
                        <option value="Google Slides">Google Slides</option>
                        <option value="PDF / File">PDF / File</option>
                        <option value="Cloud Link">Cloud Link</option>
                      </select>
                    ) : (
                      <div className="w-full text-xs p-2 rounded-lg border border-input bg-muted/40 text-foreground font-mono">
                        PDF / File (Encrypted Storage)
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Related Record Category</label>
                    <select 
                      value={newRelatedType}
                      onChange={e => {
                        setNewRelatedType(e.target.value as any);
                        setNewRelatedId('');
                        setNewRelatedName('');
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="Funding">Donor / Grant Agreement</option>
                      <option value="Program">Program / Initiative</option>
                      <option value="Event">Event / Workshop</option>
                      <option value="Person">Person</option>
                      <option value="Organization">Organization</option>
                      <option value="General">General Operations</option>
                    </select>
                  </div>
                </div>

                {newRelatedType === 'Funding' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Select Funding / Grant Record *</label>
                    <select
                      value={newRelatedId}
                      onChange={e => {
                        const id = e.target.value;
                        setNewRelatedId(id);
                        const f = funding.find(item => item.id === id);
                        if (f) setNewRelatedName(f.funderName || f.donorOrFunder);
                        else setNewRelatedName('');
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="">-- Choose Grant Agreement --</option>
                      {funding.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.funderName || f.donorOrFunder} (${f.amountCad.toLocaleString('en-CA')} CAD · {f.fiscalYear || '2026-2027'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : newRelatedType === 'Program' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Select Program / Initiative *</label>
                    <select
                      value={newRelatedId}
                      onChange={e => {
                        const id = e.target.value;
                        setNewRelatedId(id);
                        const pr = programs.find(item => item.id === id);
                        if (pr) setNewRelatedName(pr.name);
                        else setNewRelatedName('');
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="">-- Choose Program --</option>
                      {programs.map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name}</option>
                      ))}
                    </select>
                  </div>
                ) : newRelatedType === 'Event' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Select Event / Workshop *</label>
                    <select
                      value={newRelatedId}
                      onChange={e => {
                        const id = e.target.value;
                        setNewRelatedId(id);
                        const ev = events.find(item => item.id === id);
                        if (ev) setNewRelatedName(ev.name);
                        else setNewRelatedName('');
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="">-- Choose Event --</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>
                      ))}
                    </select>
                  </div>
                ) : newRelatedType === 'Person' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Select Person / Stakeholder *</label>
                    <select
                      value={newRelatedId}
                      onChange={e => {
                        const id = e.target.value;
                        setNewRelatedId(id);
                        const p = people.find(item => item.id === id);
                        if (p) setNewRelatedName(p.name);
                        else setNewRelatedName('');
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="">-- Choose Person --</option>
                      {people.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Related Entity Name</label>
                    <Input 
                      type="text"
                      placeholder="e.g. Operations, Legal, or Community Board"
                      value={newRelatedName}
                      onChange={e => setNewRelatedName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Notes / Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief note on what this document contains..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetModal}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="crimson"
                    size="sm"
                    disabled={isUploading}
                    className="shadow-xs font-semibold cursor-pointer gap-1.5"
                  >
                    {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{modalMode === 'link' ? 'Attach Link' : 'Upload to Secure Storage'}</span>
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
