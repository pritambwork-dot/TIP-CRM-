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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

interface DocumentsViewProps {
  selectedDocId?: string | null;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  selectedDocId
}) => {
  const { documents, addDocument, currentUser, hasPermission, Permissions } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Handle selected document from global search
  React.useEffect(() => {
    if (selectedDocId) {
      const doc = documents.find(d => d.id === selectedDocId);
      if (doc) {
        setSelectedType('All');
        setSearchQuery(doc.title);
      }
    }
  }, [selectedDocId, documents]);

  const canCreateDoc = hasPermission('documents', 'create');

  // Add document modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<DocumentItem['type']>('Google Docs');
  const [newRelatedType, setNewRelatedType] = useState<DocumentItem['relatedType']>('Program');
  const [newRelatedName, setNewRelatedName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const filteredDocs = documents.filter(doc => {
    const matchesType = selectedType === 'All' ? true : doc.type === selectedType;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true :
      doc.title.toLowerCase().includes(q) ||
      (doc.relatedName && doc.relatedName.toLowerCase().includes(q)) ||
      (doc.description && doc.description.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    addDocument({
      title: newTitle.trim(),
      url: newUrl.trim(),
      type: newType,
      relatedType: newRelatedType,
      relatedName: newRelatedName.trim() || undefined,
      addedBy: currentUser.name,
      description: newDescription.trim() || undefined
    });

    setNewTitle('');
    setNewUrl('');
    setNewRelatedName('');
    setNewDescription('');
    setShowAddModal(false);
  };

  const docTypes = ['All', 'Google Docs', 'Google Sheets', 'Google Drive', 'Google Slides', 'PDF / File', 'Cloud Link'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Documents & Links</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Quick access to relevant project, funding, and reporting documents without heavy file migrations.
          </p>
        </div>

        {canCreateDoc ? (
          <Button
            onClick={() => setShowAddModal(true)}
            id="btn-attach-document"
            variant="crimson"
            size="sm"
            className="gap-2 text-xs shadow-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Attach document link</span>
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
            <span>Attach document link</span>
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documents by title, attached program, or note..."
            className="pl-9 pr-9 text-xs sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 rounded-full hover:bg-muted/80 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
                  <Badge variant="secondary" className="text-[10px]">
                    {doc.type}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{doc.addedAt}</span>
                </div>

                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-foreground hover:text-primary hover:underline flex items-start justify-between gap-2 group text-sm"
                >
                  <span>{doc.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </a>

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
                <span>Added by {doc.addedBy}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Document Link Modal */}
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
                <h3 className="text-sm font-semibold text-foreground">Attach Document or Cloud Link</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowAddModal(false)} 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
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

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Google Drive or External URL *</label>
                  <Input 
                    type="url"
                    required
                    placeholder="https://docs.google.com/document/d/..."
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Related Record Category</label>
                    <select 
                      value={newRelatedType}
                      onChange={e => setNewRelatedType(e.target.value as any)}
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
                  <label className="block text-xs font-semibold text-foreground mb-1">Related Entity Name</label>
                  <Input 
                    type="text"
                    placeholder="e.g. Civic Accessibility Lab"
                    value={newRelatedName}
                    onChange={e => setNewRelatedName(e.target.value)}
                  />
                </div>

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
                    Attach Link
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

