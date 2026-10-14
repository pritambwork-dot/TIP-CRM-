import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Globe, 
  MapPin, 
  Users, 
  Compass, 
  ExternalLink,
  Lock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Organization, OrgType } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { OrgDetailModal } from './OrgDetailModal';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { OneUiSearchBar } from '../ui/OneUiSearchBar';

const ORG_TYPE_FILTERS: Array<OrgType | 'All'> = [
  'All',
  'Partner',
  'Funder',
  'Community Organization',
  'Government Organization',
  'University',
  'Institution',
  'Company'
];

interface OrganizationsViewProps {
  selectedOrgId?: string | null;
  onSelectOrg: (id: string | null) => void;
  onSelectPerson: (personId: string) => void;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({
  selectedOrgId,
  onSelectOrg,
  onSelectPerson
}) => {
  const { organizations, addOrganization, people, programs, hasPermission, Permissions } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OrgType | 'All'>('All');

  const canCreateOrg = hasPermission('organizations', 'create');

  // Add Org Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSector, setNewSector] = useState('');
  const [newType, setNewType] = useState<OrgType>('Partner');
  const [newWebsite, setNewWebsite] = useState('');
  const [newCity, setNewCity] = useState('Toronto');
  const [newProvince, setNewProvince] = useState('ON');
  const [newNotes, setNewNotes] = useState('');

  const filteredOrgs = organizations.filter(org => {
    const matchesFilter = selectedFilter === 'All' ? true : org.type === selectedFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = q === '' ? true : 
      org.name.toLowerCase().includes(q) ||
      org.sector.toLowerCase().includes(q) ||
      (org.city && org.city.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created = addOrganization({
      name: newName.trim(),
      sector: newSector.trim() || 'Civic Sector',
      type: newType,
      website: newWebsite.trim(),
      city: newCity.trim(),
      province: newProvince.trim(),
      relationshipTypes: [newType as any],
      programsInvolved: [],
      notes: newNotes.trim() || undefined
    });

    setNewName('');
    setNewSector('');
    setNewWebsite('');
    setNewNotes('');
    setShowAddModal(false);
    onSelectOrg(created.id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Organizations & Partners</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Strategic institutional relationships, funders, universities, and grassroots community alliances.
          </p>
        </div>

        <ProtectedAction resource="organizations" action="create">
          <Button
            onClick={() => setShowAddModal(true)}
            id="btn-add-organization"
            variant="crimson"
            className="shadow-sm active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add organization</span>
          </Button>
        </ProtectedAction>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <OneUiSearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by organization name, sector, or city..."
          />
        </div>

        <div className="text-xs text-muted-foreground self-center">
          Showing <strong className="text-foreground">{filteredOrgs.length}</strong> of {organizations.length} organizations
        </div>
      </div>

      {/* Sector filter pills with Motion Layout */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ORG_TYPE_FILTERS.map(cat => {
          const isActive = selectedFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="orgFilterActive"
                  className="absolute inset-0 bg-[#ea0543] rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrgs.map((org, idx) => {
          const orgPeople = people.filter(p => p.organizationId === org.id || p.organizationName?.toLowerCase().includes(org.name.toLowerCase()));
          const orgPrograms = programs.filter(pr => org.programsInvolved.includes(pr.id) || pr.partnerIds.includes(org.id));

          return (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              onClick={() => onSelectOrg(org.id)}
              className="cursor-pointer group"
            >
              <Card className="h-full p-5 border-border/80 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between bg-card">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                      {org.type}
                    </Badge>
                    {org.city && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-muted-foreground/70" />
                        {org.city}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-serif font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
                    {org.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium line-clamp-1">{org.sector}</p>

                  {org.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {org.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <Users className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {orgPeople.length} contacts
                    </span>
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <Compass className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {orgPrograms.length} programs
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-primary group-hover:underline">
                    Details &rarr;
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add Org Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.25 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="text-base font-serif font-bold text-foreground">Add Organization / Partner</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Establish a new strategic institution or community alliance</p>
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

              <form onSubmit={handleCreateOrg} className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Organization Name *</label>
                  <Input 
                    type="text"
                    required
                    placeholder="e.g. Toronto Community Foundation"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Type</label>
                    <select 
                      value={newType}
                      onChange={e => setNewType(e.target.value as OrgType)}
                      className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-card text-foreground"
                    >
                      {ORG_TYPE_FILTERS.filter(f => f !== 'All').map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Sector</label>
                    <Input 
                      type="text"
                      placeholder="e.g. Philanthropy, Education"
                      value={newSector}
                      onChange={e => setNewSector(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Website</label>
                    <Input 
                      type="text"
                      placeholder="https://example.ca"
                      value={newWebsite}
                      onChange={e => setNewWebsite(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">City / Region</label>
                    <Input 
                      type="text"
                      placeholder="Toronto, ON"
                      value={newCity}
                      onChange={e => setNewCity(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Partnership Context & Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="How does TIP collaborate with this organization? Active grants or initiatives..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-input bg-card text-foreground focus:ring-1 focus:ring-ring focus:outline-hidden"
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
                    className="shadow-sm"
                  >
                    Save Organization
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Org Detail Modal */}
      {selectedOrgId && (
        <OrgDetailModal
          orgId={selectedOrgId}
          isOpen={!!selectedOrgId}
          onClose={() => onSelectOrg(null)}
          onSelectPerson={onSelectPerson}
        />
      )}
    </div>
  );
};
