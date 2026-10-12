import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  ExternalLink, 
  Download,
  Trash2,
  Calendar, 
  Filter, 
  FolderOpen,
  FileSpreadsheet,
  FileCode,
  Tag,
  Lock,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Info,
  X
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
  validateFileUpload, 
  validateExternalDocumentUrl, 
  sanitizeFilename,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES 
} from '../../lib/fileSecurity';
import { SupabaseStorageEngine } from '../../lib/supabase';

interface DocumentsViewProps {
  selectedDocId?: string | null;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  selectedDocId
}) => {
  const { 
    scopedDocuments, 
    addDocument, 
    deleteDocument, 
    currentUser, 
    isSuperAdmin, 
    isStaffManager, 
    hasPermission, 
    Permissions, 
    logAudit 
  } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Handle selected document from global search
  React.useEffect(() => {
    if (selectedDocId) {
      const doc = scopedDocuments.find(d => d.id === selectedDocId);
      if (doc) {
        setSelectedType('All');
        setSearchQuery(doc.title);
      }
    }
  }, [selectedDocId, scopedDocuments]);

  const canCreateDoc = hasPermission('documents', 'create');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'link' | 'upload'>('link');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<DocumentItem['type']>('Google Docs');
  const [newRelatedType, setNewRelatedType] = useState<DocumentItem['relatedType']>('Program');
  const [newRelatedName, setNewRelatedName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [accessTier, setAccessTier] = useState<DocumentItem['accessTier']>('all');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = scopedDocuments.filter(doc => {
    const matchesType = selectedType === 'All' ? true : 
      (selectedType === 'Uploaded Files' ? doc.isDirectUpload : doc.type === selectedType);
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true :
      doc.title.toLowerCase().includes(q) ||
      (doc.relatedName && doc.relatedName.toLowerCase().includes(q)) ||
      (doc.description && doc.description.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  });

  const handleUrlChange = (val: string) => {
    setNewUrl(val);
    if (!val.trim()) {
      setUrlWarning(null);
      return;
    }
    const check = validateExternalDocumentUrl(val);
    if (!check.valid) {
      setUrlWarning(check.error || 'Invalid URL');
    } else if (check.hasPublicSharingWarning) {
      setUrlWarning('Notice: This link appears to have public sharing parameters. Verify permissions in Google Drive before attaching.');
    } else {
      setUrlWarning(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileUpload(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    if (!newTitle.trim()) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleSafeOpenLink = (e: React.MouseEvent, url: string, title: string) => {
    e.preventDefault();
    const validation = validateExternalDocumentUrl(url);
    if (!validation.valid) {
      setActionError(`Cannot open link: ${validation.error}`);
      return;
    }
    logAudit('document.open_link', 'Document', title, `Opened external cloud document`);
    window.open(validation.sanitizedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFile = async (doc: DocumentItem) => {
    if (!doc.storagePath) {
      // External link fallback
      const check = validateExternalDocumentUrl(doc.url);
      if (check.valid) {
        window.open(check.sanitizedUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setDownloadingId(doc.id);
    setActionError(null);
    try {
      const res = await SupabaseStorageEngine.createSignedDocumentUrl(doc.storagePath, 60);
      if (res.error || !res.signedUrl) {
        setActionError(`Download failed: ${res.error || 'Could not generate signed URL.'}`);
        return;
      }

      logAudit('document.download', 'Document', doc.title, `Downloaded private file (Signed URL 60s)`);

      // Trigger download
      if (res.signedUrl.startsWith('#download-authorized')) {
        // Dev mode simulation download
        const blob = new Blob([`TIP Confidential Document Reference: ${doc.title}\nAdded: ${doc.addedAt}\nPath: ${doc.storagePath}`], { type: 'text/plain' });
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = sanitizeFilename(doc.title + '.txt');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      } else {
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setActionError(`Download error: ${err?.message || 'Network error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`)) {
      return;
    }
    const success = await deleteDocument(doc.id);
    if (!success) {
      setActionError('Permission denied: You do not have permission to delete this document.');
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!newTitle.trim()) {
      setUploadError('Document title is required.');
      return;
    }

    if (modalMode === 'link') {
      const urlCheck = validateExternalDocumentUrl(newUrl);
      if (!urlCheck.valid) {
        setUploadError(urlCheck.error || 'Please enter a valid secure HTTPS link.');
        return;
      }

      addDocument({
        title: newTitle.trim(),
        url: urlCheck.sanitizedUrl,
        type: newType,
        relatedType: newRelatedType,
        relatedName: newRelatedName.trim() || undefined,
        addedBy: currentUser.name,
        description: newDescription.trim() || undefined,
        isConfidential,
        accessTier,
        isDirectUpload: false
      });
    } else {
      // Direct File Upload Mode
      if (!selectedFile) {
        setUploadError('Please select a file to upload.');
        return;
      }

      setIsUploading(true);
      const docId = `doc-${Date.now()}`;
      const uploadRes = await SupabaseStorageEngine.uploadPrivateDocument({
        file: selectedFile,
        documentId: docId,
        organizationId: currentUser.organizationId || 'org-tip'
      });

      setIsUploading(false);

      if (!uploadRes.success || !uploadRes.storagePath) {
        setUploadError(uploadRes.error || 'Upload failed.');
        return;
      }

      addDocument({
        title: newTitle.trim(),
        url: uploadRes.url || `storage://${uploadRes.storagePath}`,
        storagePath: uploadRes.storagePath,
        fileSize: uploadRes.fileSize,
        mimeType: uploadRes.mimeType,
        type: 'Uploaded File',
        relatedType: newRelatedType,
        relatedName: newRelatedName.trim() || undefined,
        addedBy: currentUser.name,
        description: newDescription.trim() || undefined,
        isConfidential,
        accessTier,
        isDirectUpload: true
      });
    }

    // Reset & close
    setNewTitle('');
    setNewUrl('');
    setSelectedFile(null);
    setNewRelatedName('');
    setNewDescription('');
    setIsConfidential(false);
    setAccessTier('all');
    setUploadError(null);
    setUrlWarning(null);
    setShowAddModal(false);
  };

  const docTypes = ['All', 'Uploaded Files', 'Google Docs', 'Google Sheets', 'Google Drive', 'Google Slides', 'PDF / File', 'Cloud Link'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Documents & Links</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Confidential repository for TIP agreements, reports, participant resources, and cloud files.
          </p>
        </div>

        {canCreateDoc ? (
          <Button
            onClick={() => {
              setUploadError(null);
              setUrlWarning(null);
              setShowAddModal(true);
            }}
            id="btn-attach-document"
            variant="crimson"
            size="sm"
            className="gap-2 text-xs shadow-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add document</span>
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
            <span>Add document</span>
          </Button>
        )}
      </div>

      {/* Security & Confidentiality Notice Callout */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Data Protection & Privacy Notice</p>
          <p className="text-muted-foreground leading-relaxed">
            Directly uploaded files are stored in TIP's private, encrypted storage bucket and served strictly via 60-second authorized signed URLs. External cloud links (Google Drive, Docs) are protected by Google Workspace access permissions. Restricted documents are shielded from unprivileged roles.
          </p>
        </div>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="p-1 hover:bg-destructive/20 rounded-md">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
      {filteredDocs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/50">
          <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="font-semibold text-foreground text-sm">No documents found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? 'No documents matched your search filter.' 
              : 'No documents have been attached or your account role has restricted access.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, index) => {
            const isOwner = doc.addedBy === currentUser.name;
            const canDeleteDoc = isSuperAdmin || isStaffManager || isOwner;

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.25) }}
                whileHover={{ y: -2 }}
              >
                <Card className="p-5 bg-card border-border hover:border-border/80 hover:shadow-md transition-all flex flex-col justify-between h-full">
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {doc.isDirectUpload ? 'Private Upload' : doc.type}
                        </Badge>
                        {doc.isConfidential && (
                          <Badge variant="destructive" className="text-[10px] gap-1 bg-red-600/90 hover:bg-red-600">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Confidential</span>
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{doc.addedAt}</span>
                    </div>

                    {/* Title & Action Link */}
                    {doc.isDirectUpload ? (
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-foreground text-sm leading-snug">
                          {doc.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={downloadingId === doc.id}
                          onClick={() => handleDownloadFile(doc)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1 shrink-0 font-medium"
                          title="Generate 60-second secure signed download URL"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === doc.id ? 'Authorizing...' : 'Download'}</span>
                        </Button>
                      </div>
                    ) : (
                      <a
                        href={doc.url}
                        onClick={(e) => handleSafeOpenLink(e, doc.url, doc.title)}
                        className="font-bold text-foreground hover:text-primary hover:underline flex items-start justify-between gap-2 group text-sm leading-snug cursor-pointer"
                        title="Opens external cloud file in new tab"
                      >
                        <span>{doc.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                      </a>
                    )}

                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground/80 truncate max-w-[170px]">
                      <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{doc.relatedName ? `${doc.relatedType}: ${doc.relatedName}` : doc.relatedType}</span>
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <span>Added by {doc.addedBy}</span>
                      {canDeleteDoc && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                          title="Delete document reference"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Document / Upload Modal */}
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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Add Document to CRM</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowAddModal(false)} 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="px-5 pt-4 pb-1 border-b border-border flex gap-4">
                <button
                  type="button"
                  onClick={() => setModalMode('link')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    modalMode === 'link' 
                      ? 'border-[#ea0543] text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Attach Cloud Link (Google / M365)
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('upload')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    modalMode === 'upload' 
                      ? 'border-[#ea0543] text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Upload Private File (Supabase Storage)
                </button>
              </div>

              <form onSubmit={handleCreateDocument} className="p-5 space-y-3.5">
                {uploadError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-xs text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

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
                    <label className="block text-xs font-semibold text-foreground mb-1">External HTTPS Link *</label>
                    <Input 
                      type="url"
                      required
                      placeholder="https://docs.google.com/document/d/..."
                      value={newUrl}
                      onChange={e => handleUrlChange(e.target.value)}
                    />
                    {urlWarning && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{urlWarning}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Select File (PDF, CSV, XLSX, DOCX, PNG, JPG — Max 10MB) *
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-input hover:border-primary rounded-xl p-4 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <input 
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.csv,.xlsx,.docx,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileSelect}
                      />
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1.5" />
                      {selectedFile ? (
                        <div className="text-xs font-medium text-foreground">
                          <span className="font-semibold text-primary">{selectedFile.name}</span>
                          <span className="text-muted-foreground ml-2">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Click to browse</span> or drag and drop a file
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {modalMode === 'link' && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Document Format</label>
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
                    </div>
                  )}

                  <div className={modalMode === 'upload' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-foreground mb-1">Related Entity Category</label>
                    <select 
                      value={newRelatedType}
                      onChange={e => {
                        const val = e.target.value as any;
                        setNewRelatedType(val);
                        if (val === 'Funding') {
                          setIsConfidential(true);
                          setAccessTier('management');
                        }
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="Program">Program / Initiative</option>
                      <option value="Event">Event / Workshop</option>
                      <option value="Funding">Donor / Grant Agreement</option>
                      <option value="Organization">Organization</option>
                      <option value="Person">Person</option>
                      <option value="General">General Operations</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Linked Record Name</label>
                  <Input 
                    type="text"
                    placeholder="e.g. Youth Leadership & Civic Equity Initiative"
                    value={newRelatedName}
                    onChange={e => setNewRelatedName(e.target.value)}
                  />
                </div>

                {/* Confidentiality & Access Tier Controls */}
                <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="chk-confidential" className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mark as Confidential Document</span>
                    </label>
                    <input 
                      id="chk-confidential"
                      type="checkbox"
                      checked={isConfidential}
                      onChange={e => {
                        setIsConfidential(e.target.checked);
                        if (e.target.checked && accessTier === 'all') {
                          setAccessTier('staff');
                        }
                      }}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                  </div>

                  {isConfidential && (
                    <div className="pt-2 border-t border-border/60">
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Minimum Authorized Tier</label>
                      <select 
                        value={accessTier}
                        onChange={e => setAccessTier(e.target.value as any)}
                        className="w-full text-xs p-1.5 rounded-lg border border-input bg-background text-foreground"
                      >
                        <option value="staff">Staff Members & Management</option>
                        <option value="management">Staff Management & Executive Only</option>
                        <option value="super_admin">Super Administrator Only</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Notes / Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief description of the document contents..."
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
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="crimson"
                    size="sm"
                    disabled={isUploading}
                    className="shadow-xs font-semibold"
                  >
                    {isUploading ? 'Uploading...' : modalMode === 'upload' ? 'Upload & Save' : 'Attach Link'}
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
