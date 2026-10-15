import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Mail, 
  Phone, 
  Building2, 
  Clock, 
  ArrowUpDown, 
  UserPlus,
  AlertCircle,
  MoreHorizontal,
  Lock,
  X,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Person, RelationshipType } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { PersonDetailModal } from './PersonDetailModal';
import { ProtectedAction } from '../common/ProtectedAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { OneUiSearchBar } from '../ui/OneUiSearchBar';

const RELATIONSHIP_FILTERS: Array<RelationshipType | 'All'> = [
  'All',
  'Partner',
  'Funder / Donor',
  'Participant',
  'Volunteer',
  'Advisor',
  'Facilitator',
  'Stakeholder'
];

interface PeopleViewProps {
  selectedPersonId?: string | null;
  onSelectPerson: (id: string | null) => void;
  onNavigateToProgram?: (programId: string) => void;
  onOpenImport?: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  selectedPersonId,
  onSelectPerson,
  onNavigateToProgram,
  onOpenImport
}) => {
  const { scopedPeople, people, addPerson, currentUser, hasPermission, Permissions } = useCrm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RelationshipType | 'All'>('All');
  
  // Add Person Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Toronto');
  const [newRelationshipTypes, setNewRelationshipTypes] = useState<RelationshipType[]>(['Partner']);
  const [newInterests, setNewInterests] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and search on scoped people collection with debouncing and memoization
  const filteredPeople = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    return scopedPeople.filter(person => {
      const matchesCategory = selectedFilter === 'All' 
        ? true 
        : person.relationshipTypes.includes(selectedFilter);

      if (!matchesCategory) return false;
      if (q === '') return true;

      return (
        person.name.toLowerCase().includes(q) ||
        person.email.toLowerCase().includes(q) ||
        (person.organizationName && person.organizationName.toLowerCase().includes(q)) ||
        (person.role && person.role.toLowerCase().includes(q)) ||
        person.interests.some(i => i.toLowerCase().includes(q))
      );
    });
  }, [scopedPeople, selectedFilter, debouncedQuery]);

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const created = addPerson({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole.trim() || 'Community Partner',
      organizationName: newOrgName.trim() || undefined,
      phone: newPhone.trim() || undefined,
      city: newCity.trim(),
      relationshipTypes: newRelationshipTypes.length > 0 ? newRelationshipTypes : ['Partner'],
      interests: newInterests.split(',').map(s => s.trim()).filter(Boolean),
      notes: newNotes.trim() || undefined,
      programIds: [],
      eventIds: [],
      mailchimpStatus: 'subscribed'
    });

    // Reset form
    setNewName('');
    setNewEmail('');
    setNewRole('');
    setNewOrgName('');
    setNewPhone('');
    setNewInterests('');
    setNewNotes('');
    setShowAddModal(false);
    onSelectPerson(created.id);
  };

  const toggleRelationshipType = (type: RelationshipType) => {
    if (newRelationshipTypes.includes(type)) {
      if (newRelationshipTypes.length > 1) {
        setNewRelationshipTypes(newRelationshipTypes.filter(t => t !== type));
      }
    } else {
      setNewRelationshipTypes([...newRelationshipTypes, type]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">People Directory</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Manage relationships with community partners, youth participants, funders, and advisors.
          </p>
        </div>

        <ProtectedAction resource="people" action="create">
          <div className="flex items-center gap-2.5">
            {onOpenImport && (
              <Button
                onClick={onOpenImport}
                id="btn-import-contacts-people"
                variant="outline"
                className="shadow-xs active:scale-98 shrink-0 hover:bg-muted"
              >
                <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>Import contacts</span>
              </Button>
            )}

            <Button
              onClick={() => setShowAddModal(true)}
              id="btn-add-person"
              variant="crimson"
              className="shadow-sm active:scale-98 shrink-0"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span>Add person</span>
            </Button>
          </div>
        </ProtectedAction>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <OneUiSearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, organization, email, or interests..."
          />
        </div>

        {/* Count summary & Scope badge */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground self-center">
          <span>
            Showing <strong className="text-foreground">{filteredPeople.length}</strong> of {people.length} people
          </span>
          <Badge variant={currentUser?.dataScope?.people === 'GLOBAL' ? 'secondary' : 'outline'} className="text-[10px] font-semibold">
            {currentUser?.dataScope?.people === 'GLOBAL' ? 'Organization Scope' : 'Assigned Programs Scope'}
          </Badge>
        </div>
      </div>

      {/* Category Pills Filter with Motion Layout */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {RELATIONSHIP_FILTERS.map(cat => {
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
                  layoutId="peopleCategoryActive"
                  className="absolute inset-0 bg-[#ea0543] rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          );
        })}
      </div>

      {/* People Table */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        {filteredPeople.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No people found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No contacts match your current filter or search criteria.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('All');
              }}
              className="mt-4 text-xs font-semibold"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Name & Role</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Touchpoints</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPeople.map((person, idx) => (
                  <motion.tr
                    key={person.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                    onClick={() => onSelectPerson(person.id)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    {/* Name & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-border/70 shrink-0">
                          <AvatarFallback className="bg-muted text-foreground font-bold text-xs">
                            {person.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs sm:text-sm truncate">
                            {person.name}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Organization & Role */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground truncate">
                        {person.organizationName || 'Independent / Community'}
                      </p>
                      <p className="text-muted-foreground text-[11px] truncate">
                        {person.role || 'Member'}
                      </p>
                    </td>

                    {/* Relationship Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {person.relationshipTypes.map((rt, i) => (
                          <Badge 
                            key={i}
                            variant="secondary"
                            className="text-[10px] font-semibold"
                          >
                            {rt}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    {/* Last & Next Follow-up */}
                    <td className="py-3 px-4 text-[11px] text-muted-foreground">
                      <div>Last: <span className="font-medium text-foreground">{person.lastInteractionDate || 'None'}</span></div>
                      {person.nextFollowUpDate && (
                        <div className="text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                          Follow-up: {person.nextFollowUpDate}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPerson(person.id);
                        }}
                        className="text-xs h-7 px-2.5 font-medium group-hover:border-primary/40 group-hover:text-primary"
                      >
                        View workspace
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Person Modal */}
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
              className="w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="text-base font-serif font-bold text-foreground">Add Person to TIP CRM</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Create a new partner, participant, or advisor record</p>
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

              <form onSubmit={handleCreatePerson} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Full Name *</label>
                    <Input 
                      type="text"
                      required
                      placeholder="e.g. Jordan Patel"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Email Address *</label>
                    <Input 
                      type="email"
                      required
                      placeholder="e.g. jordan@example.ca"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Organization Name</label>
                    <Input 
                      type="text"
                      placeholder="e.g. Toronto Accessibility Network"
                      value={newOrgName}
                      onChange={e => setNewOrgName(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Role / Title</label>
                    <Input 
                      type="text"
                      placeholder="e.g. Community Coordinator"
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Phone (Optional)</label>
                    <Input 
                      type="tel"
                      placeholder="+1 (416) 555-0199"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
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

                {/* Relationship Types (Multi-select) */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Relationship Categories (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Partner', 'Funder / Donor', 'Participant', 'Volunteer', 'Advisor', 'Facilitator', 'Stakeholder', 'Other'] as RelationshipType[]).map(rt => {
                      const isSelected = newRelationshipTypes.includes(rt);
                      return (
                        <button
                          type="button"
                          key={rt}
                          onClick={() => toggleRelationshipType(rt)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#ea0543] text-white shadow-2xs'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          }`}
                        >
                          {rt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Interests & Expertise (comma-separated)</label>
                  <Input 
                    type="text"
                    placeholder="Youth leadership, ASL, Policy research"
                    value={newInterests}
                    onChange={e => setNewInterests(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Initial Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="How did TIP connect with this person? Initial conversation notes..."
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
                    Add to Directory
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Person Detail Slide-Over Modal */}
      {selectedPersonId && (
        <PersonDetailModal
          personId={selectedPersonId}
          isOpen={!!selectedPersonId}
          onClose={() => onSelectPerson(null)}
          onNavigateToProgram={onNavigateToProgram}
        />
      )}
    </div>
  );
};
