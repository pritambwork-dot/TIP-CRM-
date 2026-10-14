import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Lock, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Eye, 
  Edit3, 
  Trash2, 
  Key, 
  Database, 
  Activity, 
  Sparkles, 
  Sliders, 
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  ArrowRight,
  Code
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { RoleId, UserProfile, ResourceType, ActionType, UserDataScope } from '../../types';
import { ROLE_DEFINITIONS, checkUserPermission } from '../../lib/permissions';

interface UsersAndAccessViewProps {
  onOpenAddUser?: () => void;
}

export const UsersAndAccessView: React.FC<UsersAndAccessViewProps> = () => {
  const { 
    users, 
    currentUser, 
    updateUser, 
    addUser, 
    deleteUser, 
    adminProvisionUser,
    adminResetUserPassword,
    programs, 
    events,
    auditLogs,
    posts,
    postResponsibilities,
    isSuperAdmin,
    hasPermission,
    Permissions
  } = useCrm();

  const canManageUsers = isSuperAdmin || hasPermission('users', 'manage');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser.id);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles' | 'audit' | 'schema'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleId>('program_coordinator');
  const [newUserPostId, setNewUserPostId] = useState<string>('');
  const [newUserAssignedRoles, setNewUserAssignedRoles] = useState<RoleId[]>(['program_coordinator']);
  const [newUserTempPassword, setNewUserTempPassword] = useState<string>(() => 
    'TIP-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '!' + Math.floor(100 + Math.random() * 900)
  );
  const [newUserStatus, setNewUserStatus] = useState<'Active' | 'Inactive'>('Active');
  const [newUserPrograms, setNewUserPrograms] = useState<string[]>(['prog-1']);
  const [newUserEvents, setNewUserEvents] = useState<string[]>(['evt-1']);
  const [newUserDataScopePeople, setNewUserDataScopePeople] = useState<'GLOBAL' | 'ASSIGNED'>('ASSIGNED');
  const [newUserDataScopeFunding, setNewUserDataScopeFunding] = useState<'ALL' | 'VIEW' | 'NONE'>('NONE');

  // Modal and Alert notices
  const [provisionedNotice, setProvisionedNotice] = useState<{ name: string; email: string; tempPass: string } | null>(null);
  const [resetPassNotice, setResetPassNotice] = useState<{ name: string; tempPass: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Check 12: Authoritative Server-Side Audit Trail State
  const canViewAuditLogs = isSuperAdmin || hasPermission('audit_logs', 'view') || currentUser.roleId === 'staff_manager';
  const [serverAuditLogs, setServerAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(25);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditResourceFilter, setAuditResourceFilter] = useState<string>('all');
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditIsLoading, setAuditIsLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchServerAuditLogs = useCallback(async () => {
    if (!canViewAuditLogs) return;
    setAuditIsLoading(true);
    setAuditError(null);
    try {
      const params = new URLSearchParams({
        page: String(auditPage),
        pageSize: String(auditPageSize),
        action: auditActionFilter !== 'all' ? auditActionFilter : '',
        resourceType: auditResourceFilter !== 'all' ? auditResourceFilter : '',
        outcome: auditOutcomeFilter !== 'all' ? auditOutcomeFilter : '',
        search: auditSearchQuery.trim()
      });

      const res = await fetch(`/api/audit/logs?${params.toString()}`, {
        headers: {
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.roleId,
          'X-User-Name': currentUser.name
        }
      });

      if (!res.ok) {
        throw new Error(`Audit log fetch failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.logs)) {
        setServerAuditLogs(data.logs);
        setAuditTotal(data.total !== undefined ? data.total : data.logs.length);
      }
    } catch (err: any) {
      setAuditError(err?.message || 'Failed fetching server audit trail');
    } finally {
      setAuditIsLoading(false);
    }
  }, [canViewAuditLogs, auditPage, auditPageSize, auditActionFilter, auditResourceFilter, auditOutcomeFilter, auditSearchQuery, currentUser]);

  useEffect(() => {
    if (activeSubTab === 'audit' && canViewAuditLogs) {
      fetchServerAuditLogs();
    }
  }, [activeSubTab, canViewAuditLogs, fetchServerAuditLogs]);

  // Selected User for editing with safe fallback
  const rawSelectedUser = users.find(u => u.id === selectedUserId) || users[0];
  const selectedUser = rawSelectedUser ? {
    ...rawSelectedUser,
    dataScope: rawSelectedUser.dataScope || { people: 'GLOBAL', programs: 'ALL', events: 'ALL', funding: 'ALL' },
    assignedProgramIds: rawSelectedUser.assignedProgramIds || [],
    assignedEventIds: rawSelectedUser.assignedEventIds || []
  } : undefined;

  // User Counts
  const superAdminCount = users.filter(u => u.roleId === 'super_admin').length;
  const staffManagerCount = users.filter(u => u.roleId === 'staff_manager').length;
  const staffMemberCount = users.filter(u => u.roleId === 'staff_member').length;
  const volunteerCount = users.filter(u => u.roleId === 'volunteer').length;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.roleId === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId: string, newRoleId: RoleId) => {
    const roleDef = ROLE_DEFINITIONS[newRoleId];
    updateUser(userId, {
      roleId: newRoleId,
      role: newRoleId === 'volunteer' ? 'volunteer' : 'staff',
      title: roleDef.name,
      dataScope: { ...roleDef.defaultDataScope },
      permissionsOverride: undefined // reset overrides to inherit clean role defaults
    });
    setSaveSuccessMessage(`Role updated to ${roleDef.name}`);
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const handlePostChange = (userId: string, newPostId: string) => {
    const post = posts.find(p => p.id === newPostId);
    const responsibilities = postResponsibilities.filter(r => r.postId === newPostId).map(r => r.name);
    updateUser(userId, {
      postId: newPostId || undefined,
      postTitle: post?.name || undefined,
      responsibilities
    });
    setSaveSuccessMessage(`Assigned to post: ${post?.name || 'None'}`);
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const handlePermissionToggle = (permKey: string) => {
    if (!selectedUser) return;
    const currentOverrides = selectedUser.permissionsOverride || {};
    const roleDef = ROLE_DEFINITIONS[selectedUser.roleId || 'staff_member'] || ROLE_DEFINITIONS.staff_member;
    const defaultVal = !!roleDef.defaultPermissions[permKey];
    const currentVal = typeof currentOverrides[permKey] === 'boolean' 
      ? currentOverrides[permKey] 
      : defaultVal;

    const updatedOverrides = {
      ...currentOverrides,
      [permKey]: !currentVal
    };

    updateUser(selectedUser.id, {
      permissionsOverride: updatedOverrides
    });
    setSaveSuccessMessage('Permission customized');
    setTimeout(() => setSaveSuccessMessage(null), 2000);
  };

  const handleDataScopeChange = (key: keyof UserDataScope, value: any) => {
    if (!selectedUser) return;
    const currentScope = selectedUser.dataScope || { people: 'GLOBAL', programs: 'ALL', events: 'ALL', funding: 'ALL' };
    updateUser(selectedUser.id, {
      dataScope: {
        ...currentScope,
        [key]: value
      }
    });
    setSaveSuccessMessage(`Data scope for ${key} updated to ${value}`);
    setTimeout(() => setSaveSuccessMessage(null), 2000);
  };

  const handleToggleProgramAssignment = (programId: string) => {
    if (!selectedUser) return;
    const current = selectedUser.assignedProgramIds || [];
    const next = current.includes(programId) 
      ? current.filter(id => id !== programId) 
      : [...current, programId];
    updateUser(selectedUser.id, { assignedProgramIds: next });
  };

  const handleToggleEventAssignment = (eventId: string) => {
    if (!selectedUser) return;
    const current = selectedUser.assignedEventIds || [];
    const next = current.includes(eventId) 
      ? current.filter(id => id !== eventId) 
      : [...current, eventId];
    updateUser(selectedUser.id, { assignedEventIds: next });
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const rolesToAssign: RoleId[] = newUserAssignedRoles.length > 0 
      ? newUserAssignedRoles 
      : [newUserRole];

    const created = await adminProvisionUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      postId: newUserPostId || undefined,
      assignedRoleIds: rolesToAssign,
      assignedProgramIds: newUserPrograms,
      assignedEventIds: newUserEvents,
      tempPassword: newUserTempPassword
    });

    setProvisionedNotice({
      name: created.name,
      email: created.email,
      tempPass: created.tempPassword || newUserTempPassword
    });

    setIsAddUserOpen(false);
    setSelectedUserId(created.id);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserTitle('');
    setNewUserTempPassword('TIP-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '!' + Math.floor(100 + Math.random() * 900));
    setSaveSuccessMessage(`Account provisioned for "${created.name}"`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleAdminResetPassword = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    try {
      const res = await adminResetUserPassword(userId);
      setResetPassNotice({
        name: target.name,
        tempPass: res.tempPassword
      });
      setSaveSuccessMessage(`Temporary password generated for ${target.name}`);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (e: any) {
      alert(`Error resetting password: ${e?.message || 'Failed'}`);
    }
  };

  const handleToggleAssignedRole = (userId: string, roleId: RoleId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const currentRoles = target.assignedRoleIds || [target.roleId];
    let nextRoles: RoleId[];
    if (currentRoles.includes(roleId)) {
      if (currentRoles.length === 1) {
        alert('A user must have at least one assigned role.');
        return;
      }
      nextRoles = currentRoles.filter(r => r !== roleId);
    } else {
      nextRoles = [...currentRoles, roleId];
    }

    const nextActive = nextRoles.includes(target.activeRoleId || target.roleId)
      ? (target.activeRoleId || target.roleId)
      : nextRoles[0];

    updateUser(userId, {
      assignedRoleIds: nextRoles,
      activeRoleId: nextActive,
      roleId: nextActive
    });
    setSaveSuccessMessage(`Updated assigned roles for ${target.name}`);
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const isPermActive = (user: UserProfile, permKey: string): boolean => {
    if (user.roleId === 'super_admin') return true;
    if (user.permissionsOverride && typeof user.permissionsOverride[permKey] === 'boolean') {
      return user.permissionsOverride[permKey];
    }
    const roleDef = ROLE_DEFINITIONS[user.roleId];
    return !!roleDef.defaultPermissions[permKey];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Role Authority & Simulation */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                Live Authority & RBAC Engine
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_DEFINITIONS[currentUser.roleId]?.badgeBg || 'bg-zinc-100'} ${ROLE_DEFINITIONS[currentUser.roleId]?.badgeText || 'text-zinc-800'}`}>
                Active Role: {ROLE_DEFINITIONS[currentUser.roleId]?.name || 'Staff'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Enterprise user directory, post assignments, security roles, and data scopes.
            </p>
          </div>
        </div>
      </div>

      {/* Subtabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'users'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Access</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-white text-[10px]">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'roles'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Role Hierarchy (4 Tiers)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'audit'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Security Audit Log</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 text-zinc-700 text-[10px]">
              {auditLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'schema'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL & RLS Schema</span>
          </button>
        </div>

        {/* Global Action Notification / Add User */}
        <div className="flex items-center gap-2.5">
          {saveSuccessMessage && (
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> {saveSuccessMessage}
            </span>
          )}

          {canManageUsers ? (
            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              id="btn-add-user"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add User</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              id="btn-add-user-disabled"
              title={Permissions.getDisabledReason('users', 'manage')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-400 border border-zinc-200 text-xs font-semibold cursor-not-allowed select-none shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>+ Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: USERS & ACCESS MANAGEMENT (The Primary Master Screen) */}
      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: User Directory List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Header & Counts */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                    USERS & ACCESS
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 font-medium">
                    <span>{superAdminCount + staffManagerCount + staffMemberCount} Staff</span>
                    <span>•</span>
                    <span>{volunteerCount} Volunteers</span>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  Total: {users.length} Users
                </span>
              </div>

              {/* Search & Role Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-700"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="staff_manager">Staff Manager</option>
                  <option value="staff_member">Staff Member</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs divide-y divide-zinc-100 overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No users found matching query.
                </div>
              ) : (
                filteredUsers.map(u => {
                  const roleDef = ROLE_DEFINITIONS[u.roleId] || ROLE_DEFINITIONS.volunteer;
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-zinc-50 border-l-3 border-l-zinc-900' 
                          : 'hover:bg-zinc-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {u.avatarInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-zinc-900 truncate">
                              {u.name}
                            </h5>
                            {currentUser.id === u.id && (
                              <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.2 rounded font-medium">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${roleDef.badgeBg} ${roleDef.badgeText}`}>
                              {roleDef.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Scope: {u.dataScope?.people === 'GLOBAL' ? 'Entire Org' : 'Assigned Only'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          u.status === 'Active' 
                            ? 'text-emerald-700 bg-emerald-50' 
                            : 'text-zinc-500 bg-zinc-100'
                        }`}>
                          {u.status}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-zinc-900 translate-x-0.5' : 'text-zinc-300'}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: User Permission & Data Scope Configurator (7 cols) */}
          {selectedUser && (
            <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 p-6 shadow-2xs space-y-6">
              {/* User Header Profile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 text-white font-bold text-base flex items-center justify-center">
                    {selectedUser.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900">
                        {selectedUser.name}
                      </h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        ROLE_DEFINITIONS[selectedUser.roleId]?.badgeBg
                      } ${ROLE_DEFINITIONS[selectedUser.roleId]?.badgeText}`}>
                        {ROLE_DEFINITIONS[selectedUser.roleId]?.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedUser.title} • {selectedUser.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {users.length > 1 && selectedUser.roleId !== 'super_admin' && (
                    canManageUsers ? (
                      <button
                        type="button"
                        id="btn-delete-user"
                        onClick={() => {
                          if (confirm(`Are you sure you want to deactivate ${selectedUser.name}?`)) {
                            deleteUser(selectedUser.id);
                            setSelectedUserId(users.find(u => u.id !== selectedUser.id)?.id || null);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                        title="Deactivate / Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        id="btn-delete-user-disabled"
                        title={Permissions.getDisabledReason('users', 'manage')}
                        className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed select-none"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 1. ROLE SELECTOR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Assigned Role Hierarchy
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {ROLE_DEFINITIONS[selectedUser.roleId]?.levelLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['super_admin', 'staff_manager', 'staff_member', 'volunteer'] as RoleId[]).map(roleKey => {
                    const rDef = ROLE_DEFINITIONS[roleKey];
                    const isCurrentRole = selectedUser.roleId === roleKey;
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => handleRoleChange(selectedUser.id, roleKey)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isCurrentRole
                            ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                            : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{rDef.name}</span>
                          {isCurrentRole && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <p className={`text-[10px] mt-1 leading-snug ${isCurrentRole ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          Level {rDef.level}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                  <span className="font-semibold text-zinc-800">{ROLE_DEFINITIONS[selectedUser.roleId]?.name}: </span>
                  {ROLE_DEFINITIONS[selectedUser.roleId]?.description}
                </p>
              </div>

              {/* MULTI-ROLE ASSIGNMENT MANAGER (Section 3 & 4) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Approved Assigned Roles (Multi-Role Switching)</span>
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {(selectedUser.assignedRoleIds || [selectedUser.roleId]).length} Assigned
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50/70 text-xs">
                  {([
                    { id: 'program_coordinator' as RoleId, label: 'Program Coordinator' },
                    { id: 'event_coordinator' as RoleId, label: 'Event Coordinator' },
                    { id: 'staff_member' as RoleId, label: 'Staff Member' },
                    { id: 'staff_manager' as RoleId, label: 'Staff Manager' },
                    { id: 'volunteer' as RoleId, label: 'Volunteer' },
                    { id: 'super_admin' as RoleId, label: 'Super Admin' },
                  ]).map(r => {
                    const assigned = (selectedUser.assignedRoleIds || [selectedUser.roleId]).includes(r.id);
                    const isActive = (selectedUser.activeRoleId || selectedUser.roleId) === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          canManageUsers ? 'cursor-pointer' : 'cursor-not-allowed'
                        } ${
                          assigned ? 'bg-white border-zinc-800 shadow-2xs font-semibold' : 'border-zinc-200 bg-white/60 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!canManageUsers}
                            checked={assigned}
                            onChange={() => handleToggleAssignedRole(selectedUser.id, r.id)}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span>{r.label}</span>
                        </div>
                        {isActive && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                            Active
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-500">
                  User may only switch between roles assigned here. System strictly blocks elevation.
                </p>
              </div>

              {/* SECURITY & PASSWORD LIFECYCLE (Section 6 & 7) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Security & Password Management</span>
                  </label>
                  {selectedUser.mustChangePassword ? (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      First Login Pending
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Password Secured
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-medium">Status:</span>
                      <strong className="text-zinc-800">
                        {selectedUser.mustChangePassword ? 'Temporary password active (must change on next login)' : 'User password active'}
                      </strong>
                    </div>
                    {selectedUser.tempPassword && (
                      <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-700">
                        <span>Current Temp: <strong>{selectedUser.tempPassword}</strong></span>
                      </div>
                    )}
                    {selectedUser.passwordChangedAt && (
                      <p className="text-[11px] text-zinc-400">
                        Last changed: {new Date(selectedUser.passwordChangedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {canManageUsers && (
                    <button
                      type="button"
                      onClick={() => handleAdminResetPassword(selectedUser.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Reset Password</span>
                    </button>
                  )}
                </div>
              </div>

              {/* DESIGNATED POST & RESPONSIBILITIES (Four-Layer Employee Model) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>DESIGNATED POST & RESPONSIBILITIES</span>
                    <span className="text-[10px] font-normal text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      Work Designation
                    </span>
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    Controls task recommendations & workload
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Assigned Organizational Post:
                    </label>
                    <select
                      value={selectedUser.postId || ''}
                      onChange={(e) => handlePostChange(selectedUser.id, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white"
                    >
                      <option value="">No Post Assigned</option>
                      {posts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedUser.postId && (
                    <div>
                      <span className="text-[11px] font-semibold text-zinc-600 block mb-1">
                        Active Responsibilities under this Post:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {postResponsibilities.filter(r => r.postId === selectedUser.postId).map(r => (
                          <span 
                            key={r.id} 
                            className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-zinc-800 shadow-2xs font-medium"
                          >
                            • {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ACCESS PERMISSIONS MATRIX (Exact layout from Section 10) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    ACCESS PERMISSION MATRIX
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    Click toggles to customize or override
                  </span>
                </div>

                <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100 text-xs">
                  {/* Table Header */}
                  <div className="bg-zinc-50 px-4 py-2 flex items-center justify-between font-semibold text-zinc-600 text-[11px]">
                    <span className="w-1/3">RESOURCE</span>
                    <span className="w-2/3 flex items-center justify-end gap-6 text-right">
                      <span className="w-16 text-center">VIEW</span>
                      <span className="w-16 text-center">EDIT / MANAGE</span>
                      <span className="w-16 text-center">EXPORT</span>
                    </span>
                  </div>

                  {/* People */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">People</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('people.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'people.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'people.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('people.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'people.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'people.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('people.export')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'people.export') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'people.export') ? '✓ Export' : '✕'}
                      </button>
                    </span>
                  </div>

                  {/* Organizations */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Organizations</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('organizations.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'organizations.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'organizations.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('organizations.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'organizations.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'organizations.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Programs */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Programs</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('programs.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'programs.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'programs.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('programs.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'programs.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'programs.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Events */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Events</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('events.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'events.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'events.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('events.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'events.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'events.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Participants</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('participants.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'participants.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'participants.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('participants.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'participants.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'participants.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Tasks</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('tasks.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'tasks.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'tasks.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('tasks.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'tasks.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'tasks.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Interactions */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Interactions</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('interactions.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'interactions.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'interactions.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('interactions.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'interactions.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'interactions.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Funding */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50 bg-amber-50/20">
                    <span className="w-1/3 font-semibold text-zinc-900 flex items-center gap-1.5">
                      <span>Funding</span>
                      <Lock className="w-3 h-3 text-amber-600" />
                    </span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('funding.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'funding.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'funding.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('funding.edit')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'funding.edit') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'funding.edit') ? '✓ Edit' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* Reports */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Reports</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('reports.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'reports.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'reports.view') ? '✓ View' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('reports.export')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'reports.export') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'reports.export') ? '✓ Export' : '✕'}
                      </button>
                    </span>
                  </div>

                  {/* Documents */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50">
                    <span className="w-1/3 font-semibold text-zinc-900">Documents</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('documents.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'documents.view') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'documents.view') ? '✓ View' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('documents.create')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'documents.create') ? 'text-emerald-700 bg-emerald-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'documents.create') ? '✓ Upload' : '✕'}
                      </button>
                      <span className="w-16 text-center text-zinc-300">—</span>
                    </span>
                  </div>

                  {/* System & Users & Audit */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50/50 bg-zinc-50/40">
                    <span className="w-1/3 font-semibold text-zinc-900">Users & Security</span>
                    <span className="w-2/3 flex items-center justify-end gap-6">
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('users.manage')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'users.manage') ? 'text-rose-700 bg-rose-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'users.manage') ? '✓ Manage' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('settings.manage')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'settings.manage') ? 'text-rose-700 bg-rose-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'settings.manage') ? '✓ Settings' : '✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle('audit_logs.view')}
                        className={`w-16 py-1 rounded flex items-center justify-center font-medium cursor-pointer ${
                          isPermActive(selectedUser, 'audit_logs.view') ? 'text-blue-700 bg-blue-50' : 'text-zinc-400 bg-zinc-100'
                        }`}
                      >
                        {isPermActive(selectedUser, 'audit_logs.view') ? '✓ Logs' : '✕'}
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. DATA SCOPE (Exact layout from Section 10) */}
              <div className="space-y-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    DATA SCOPE
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    Controls what rows the database returns
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* People Scope */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                    <p className="text-xs font-bold text-zinc-900">People</p>
                    <div className="space-y-1.5 text-xs text-zinc-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="peopleScope"
                          checked={selectedUser?.dataScope?.people === 'GLOBAL'}
                          onChange={() => handleDataScopeChange('people', 'GLOBAL')}
                          className="accent-zinc-900"
                        />
                        <span>● Entire organization</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="peopleScope"
                          checked={selectedUser?.dataScope?.people === 'ASSIGNED'}
                          onChange={() => handleDataScopeChange('people', 'ASSIGNED')}
                          className="accent-zinc-900"
                        />
                        <span>○ Assigned programs only</span>
                      </label>
                    </div>
                  </div>

                  {/* Programs Scope */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                    <p className="text-xs font-bold text-zinc-900">Programs</p>
                    <div className="space-y-1.5 text-xs text-zinc-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="programsScope"
                          checked={selectedUser?.dataScope?.programs === 'ALL'}
                          onChange={() => handleDataScopeChange('programs', 'ALL')}
                          className="accent-zinc-900"
                        />
                        <span>● All programs</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="programsScope"
                          checked={selectedUser?.dataScope?.programs === 'ASSIGNED'}
                          onChange={() => handleDataScopeChange('programs', 'ASSIGNED')}
                          className="accent-zinc-900"
                        />
                        <span>○ Assigned + owned</span>
                      </label>
                    </div>
                  </div>

                  {/* Events Scope */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                    <p className="text-xs font-bold text-zinc-900">Events</p>
                    <div className="space-y-1.5 text-xs text-zinc-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="eventsScope"
                          checked={selectedUser?.dataScope?.events === 'ALL'}
                          onChange={() => handleDataScopeChange('events', 'ALL')}
                          className="accent-zinc-900"
                        />
                        <span>● All events</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="eventsScope"
                          checked={selectedUser?.dataScope?.events === 'ASSIGNED'}
                          onChange={() => handleDataScopeChange('events', 'ASSIGNED')}
                          className="accent-zinc-900"
                        />
                        <span>○ Assigned programs/events</span>
                      </label>
                    </div>
                  </div>

                  {/* Funding Scope */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                    <p className="text-xs font-bold text-zinc-900">Funding</p>
                    <div className="space-y-1.5 text-xs text-zinc-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="fundingScope"
                          checked={selectedUser?.dataScope?.funding === 'ALL'}
                          onChange={() => handleDataScopeChange('funding', 'ALL')}
                          className="accent-zinc-900"
                        />
                        <span>● Full access</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="fundingScope"
                          checked={selectedUser?.dataScope?.funding === 'VIEW'}
                          onChange={() => handleDataScopeChange('funding', 'VIEW')}
                          className="accent-zinc-900"
                        />
                        <span>○ View only</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="fundingScope"
                          checked={selectedUser?.dataScope?.funding === 'NONE'}
                          onChange={() => handleDataScopeChange('funding', 'NONE')}
                          className="accent-zinc-900"
                        />
                        <span>✕ None (Hidden)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. ASSIGNED SCOPE ASSIGNMENTS (Programs & Events) */}
              <div className="space-y-3 pt-3 border-t border-zinc-100">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  ASSIGNED PROGRAMS & EVENTS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Programs */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1.5">
                      Assigned Programs ({selectedUser.assignedProgramIds?.length || 0})
                    </label>
                    <div className="space-y-1 max-h-36 overflow-y-auto border border-zinc-200 rounded-lg p-2 bg-zinc-50/50">
                      {programs.map(pr => {
                        const isAssigned = selectedUser.assignedProgramIds?.includes(pr.id);
                        return (
                          <label key={pr.id} className="flex items-center gap-2 text-xs text-zinc-700 p-1 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleProgramAssignment(pr.id)}
                              className="accent-zinc-900"
                            />
                            <span className="truncate">{pr.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Events */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1.5">
                      Assigned Events ({selectedUser.assignedEventIds?.length || 0})
                    </label>
                    <div className="space-y-1 max-h-36 overflow-y-auto border border-zinc-200 rounded-lg p-2 bg-zinc-50/50">
                      {events.map(ev => {
                        const isAssigned = selectedUser.assignedEventIds?.includes(ev.id);
                        return (
                          <label key={ev.id} className="flex items-center gap-2 text-xs text-zinc-700 p-1 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleEventAssignment(ev.id)}
                              className="accent-zinc-900"
                            />
                            <span className="truncate">{ev.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ROLE HIERARCHY OVERVIEW */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs">
            <h4 className="text-sm font-bold text-zinc-900">
              The 4 Default TIP Roles + Configurable Data Scope
            </h4>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Super Admin acts as the ultimate authority layer. Roles establish permissions and boundaries, while data scope dictates exactly which records each user can see.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['super_admin', 'staff_manager', 'staff_member', 'volunteer'] as RoleId[]).map(roleKey => {
              const rDef = ROLE_DEFINITIONS[roleKey];
              const countInRole = users.filter(u => u.roleId === roleKey).length;
              return (
                <div key={roleKey} className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 uppercase">
                        {rDef.levelLabel}
                      </span>
                      <h4 className="text-base font-bold text-zinc-900">{rDef.name}</h4>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${rDef.badgeBg} ${rDef.badgeText}`}>
                      {countInRole} {countInRole === 1 ? 'User' : 'Users'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {rDef.description}
                  </p>

                  <div className="pt-2 border-t border-zinc-100">
                    <h5 className="text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                      Default Scope & Entitlements
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600">
                      <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                        <span className="font-semibold text-zinc-800">People: </span>
                        {rDef.defaultDataScope.people === 'GLOBAL' ? 'Entire Organization' : 'Assigned Only'}
                      </div>
                      <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                        <span className="font-semibold text-zinc-800">Funding: </span>
                        {rDef.defaultDataScope.funding === 'ALL' ? 'Full Access' : rDef.defaultDataScope.funding === 'VIEW' ? 'View Only' : 'Hidden'}
                      </div>
                      <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                        <span className="font-semibold text-zinc-800">Programs: </span>
                        {rDef.defaultDataScope.programs === 'ALL' ? 'All Programs' : 'Assigned + Owned'}
                      </div>
                      <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                        <span className="font-semibold text-zinc-800">Audit Logs: </span>
                        {rDef.defaultPermissions['audit_logs.view'] ? 'Accessible' : 'Restricted'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: AUTHORITATIVE IMMUTABLE SECURITY AUDIT LOG (Check 12) */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden space-y-0">
          {/* Header Panel */}
          <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Authoritative Immutable Security Audit Trail
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Append-Only Engine
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
                Server-verified, tamper-evident audit records of authentication changes, privilege elevation, security modifications, and high-consequence CRM actions. Records cannot be edited or deleted.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchServerAuditLogs()}
                disabled={auditIsLoading}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-white text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                title="Refresh audit trail from server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditIsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 text-white shadow-2xs">
                {auditTotal || serverAuditLogs.length || auditLogs.length} Records
              </span>
            </div>
          </div>

          {!canViewAuditLogs ? (
            <div className="p-8 text-center bg-rose-50/50">
              <Lock className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h5 className="text-sm font-bold text-rose-900">Access Restricted</h5>
              <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                Viewing the security audit trail requires the <code>audit_logs.view</code> permission. Only Super Administrators and Staff Managers may inspect audit records.
              </p>
            </div>
          ) : (
            <>
              {/* Filter and Search Bar */}
              <div className="p-4 border-b border-zinc-100 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search query */}
                <div className="relative lg:col-span-2">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search action, actor, description, or correlation ID..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-zinc-200 focus:outline-hidden focus:border-zinc-400 bg-zinc-50/50"
                  />
                </div>

                {/* Outcome Filter */}
                <div>
                  <select
                    value={auditOutcomeFilter}
                    onChange={(e) => setAuditOutcomeFilter(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="SUCCESS">Outcome: SUCCESS</option>
                    <option value="FAILURE">Outcome: FAILURE</option>
                  </select>
                </div>

                {/* Action Filter */}
                <div>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700"
                  >
                    <option value="all">All Actions</option>
                    <option value="AUTH_ROLE_SWITCH">Role Switch</option>
                    <option value="AUTH_ROLE_ELEVATION_DENIED">Elevation Denied</option>
                    <option value="AUTH_PASSWORD_CHANGE">Password Change</option>
                    <option value="AUTH_PASSWORD_RESET_ADMIN">Password Reset (Admin)</option>
                    <option value="SETTINGS_BUDGET_UPDATE">AI Budget Update</option>
                    <option value="AI_ACTION_CONFIRMED">AI Action Confirmed</option>
                    <option value="DATA_EXPORT_CSV">Data Export (CSV)</option>
                    <option value="DATA_IMPORT_CSV">Data Import (CSV)</option>
                    <option value="AUDIT_LOGS_ACCESS_DENIED">Audit Access Denied</option>
                  </select>
                </div>

                {/* Resource Type Filter */}
                <div>
                  <select
                    value={auditResourceFilter}
                    onChange={(e) => setAuditResourceFilter(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700"
                  >
                    <option value="all">All Resources</option>
                    <option value="UserRole">UserRole</option>
                    <option value="UserCredential">UserCredential</option>
                    <option value="AiBudget">AiBudget</option>
                    <option value="People">People</option>
                    <option value="AuditLog">AuditLog</option>
                    <option value="System">System</option>
                  </select>
                </div>
              </div>

              {/* Records Stream */}
              <div className="divide-y divide-zinc-100 max-h-[580px] overflow-y-auto">
                {auditIsLoading ? (
                  <div className="p-8 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                    <span>Loading authoritative security logs...</span>
                  </div>
                ) : (serverAuditLogs.length > 0 ? serverAuditLogs : auditLogs).length === 0 ? (
                  <div className="p-10 text-center text-zinc-400 text-xs">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-300" />
                    <p>No audit records match the current filters.</p>
                  </div>
                ) : (
                  (serverAuditLogs.length > 0 ? serverAuditLogs : auditLogs).map((log: any) => {
                    const isSuccess = log.outcome !== 'FAILURE';
                    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <div key={log.id} className="p-4 hover:bg-zinc-50/60 transition-colors text-xs space-y-2">
                        {/* Line 1: Header with Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Outcome Badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isSuccess 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {isSuccess ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {log.outcome || 'SUCCESS'}
                            </span>

                            {/* Action Name */}
                            <span className="font-mono font-bold text-zinc-900 text-xs">
                              {log.action}
                            </span>

                            {/* Resource Type */}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold border border-zinc-200">
                              {log.resourceType || log.entityType || 'Resource'}
                            </span>

                            {/* Entity Name */}
                            {log.entityName && (
                              <span className="font-medium text-zinc-600">
                                • {log.entityName}
                              </span>
                            )}

                            {/* Correlation ID */}
                            {log.correlationId && (
                              <span className="font-mono text-[10px] text-zinc-400 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">
                                cid: {log.correlationId}
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-zinc-400 font-medium">
                              {log.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Line 2: Description Narrative */}
                        <div className="text-zinc-700 text-xs leading-relaxed">
                          {log.description || log.details || 'Operational audit event recorded.'}
                        </div>

                        {/* Line 3: Actor & Context Metadata */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100/70">
                          <div className="flex items-center gap-3">
                            <span>
                              <strong className="text-zinc-700">Actor:</strong> {log.actorName || log.userName || 'Authorized User'} ({log.actorRole || 'role: unknown'})
                            </span>
                            {log.actorId && (
                              <span className="text-zinc-400 font-mono text-[10px]">
                                [id: {log.actorId}]
                              </span>
                            )}
                            {log.ipAddress && (
                              <span className="text-zinc-400 font-mono text-[10px]">
                                IP: {log.ipAddress}
                              </span>
                            )}
                          </div>

                          {hasMetadata && (
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Metadata' : 'View Sanitized Metadata'}</span>
                              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          )}
                        </div>

                        {/* Expandable Sanitized Metadata JSON */}
                        {isExpanded && hasMetadata && (
                          <div className="mt-2 p-3 bg-zinc-900 text-zinc-200 rounded-lg font-mono text-[11px] overflow-x-auto shadow-inner border border-zinc-800 animate-fadeIn">
                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <span>Showing page {auditPage}</span>
                  <span className="text-zinc-400">•</span>
                  <span>
                    {auditTotal > 0 ? `${auditTotal} total records` : `${serverAuditLogs.length} records`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={auditPageSize}
                    onChange={(e) => setAuditPageSize(Number(e.target.value))}
                    className="text-xs p-1 rounded border border-zinc-200 bg-white"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                    disabled={auditPage <= 1}
                    className="p-1 rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditPage(prev => prev + 1)}
                    disabled={auditPage * auditPageSize >= (auditTotal || serverAuditLogs.length)}
                    className="p-1 rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 4: POSTGRESQL & RLS SCHEMA VIEWER */}
      {activeSubTab === 'schema' && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">
                Production PostgreSQL & Row Level Security (RLS) Blueprint
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                Full relational DDL schema matching the 7 domains: Identity, CRM, Programs, Work, Funding, Documents, and Audit Logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`-- PostgreSQL Schema for TIP CRM\n-- Stored at src/db/schema.sql`);
                alert('Schema reference path copied: src/db/schema.sql');
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Copy Schema DDL</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <span className="font-bold text-zinc-900 block mb-1">Identity & RBAC</span>
              <p className="text-[11px] text-zinc-600">
                <code>users</code>, <code>roles</code>, <code>permissions</code>, <code>role_permissions</code>
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <span className="font-bold text-zinc-900 block mb-1">Row Level Security (RLS)</span>
              <p className="text-[11px] text-zinc-600">
                Enforced at the DB level for <code>people</code>, <code>programs</code>, <code>events</code>, and <code>funding_records</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <span className="font-bold text-zinc-900 block mb-1">Many-to-Many Bridge</span>
              <p className="text-[11px] text-zinc-600">
                <code>program_members</code>, <code>program_participants</code>, <code>event_participants</code>
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 text-zinc-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
            <pre>{`-- PostgreSQL / Supabase Row Level Security (RLS) Policy Example:
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_records ENABLE ROW LEVEL SECURITY;

-- Super Admin has full bypass access
CREATE POLICY super_admin_all ON people 
  FOR ALL USING (current_user_role() = 'super_admin');

-- Funding records strictly hidden from Volunteers
CREATE POLICY funding_access_policy ON funding_records 
  FOR SELECT USING (
    current_user_role() IN ('super_admin', 'staff_manager') OR
    (SELECT funding_scope FROM users WHERE id = auth.uid()) IN ('ALL', 'VIEW')
  );

-- Scoped People view for front-line Staff & Volunteers
CREATE POLICY people_scoped_view ON people 
  FOR SELECT USING (
    current_user_role() IN ('super_admin', 'staff_manager') OR
    id IN (
      SELECT person_id FROM program_participants 
      WHERE program_id IN (SELECT program_id FROM program_members WHERE user_id = auth.uid())
      UNION
      SELECT person_id FROM event_participants 
      WHERE event_id IN (SELECT event_id FROM event_staff WHERE user_id = auth.uid())
    )
  );`}</pre>
          </div>
        </div>
      )}

      {/* ADD USER MODAL (Exact layout from Section 1) */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">ADD USER</h3>
                  <p className="text-xs text-zinc-500">Configure role, access level, and data scope</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chloe Vance"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="chloe.vance@inclusionproject.ca"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Temporary Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700">Temporary Password *</label>
                  <button
                    type="button"
                    onClick={() => setNewUserTempPassword('TIP-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '!' + Math.floor(100 + Math.random() * 900))}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    Generate New
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newUserTempPassword}
                  onChange={e => setNewUserTempPassword(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-300 font-mono bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 font-semibold text-zinc-800"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  User will be forced to change this password immediately on their first login.
                </p>
              </div>

              {/* Primary Post */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Primary Post</label>
                <select
                  value={newUserPostId}
                  onChange={e => setNewUserPostId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-300 bg-white font-medium text-zinc-800"
                >
                  <option value="">Select a designated post...</option>
                  {posts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Roles (Select one or more) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Assigned Roles (Select one or more) *
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {newUserAssignedRoles.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50/60 text-xs">
                  {([
                    { id: 'program_coordinator' as RoleId, label: 'Program Coordinator' },
                    { id: 'event_coordinator' as RoleId, label: 'Event Coordinator' },
                    { id: 'staff_member' as RoleId, label: 'Staff Member' },
                    { id: 'staff_manager' as RoleId, label: 'Staff Manager' },
                    { id: 'volunteer' as RoleId, label: 'Volunteer' },
                    { id: 'super_admin' as RoleId, label: 'Super Admin' },
                  ]).map(r => {
                    const isChecked = newUserAssignedRoles.includes(r.id);
                    return (
                      <label 
                        key={r.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked ? 'bg-white border-zinc-900 font-semibold shadow-2xs' : 'border-zinc-200 bg-white/70 hover:bg-white text-zinc-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUserAssignedRoles(prev => [...prev, r.id]);
                            } else {
                              if (newUserAssignedRoles.length === 1) {
                                alert('At least one role must be assigned.');
                                return;
                              }
                              setNewUserAssignedRoles(prev => prev.filter(x => x !== r.id));
                            }
                          }}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <span>{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Programs */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Assigned Programs
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-zinc-200 rounded-lg bg-zinc-50">
                  {programs.map(pr => {
                    const isSelected = newUserPrograms.includes(pr.id);
                    return (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => {
                          setNewUserPrograms(prev => 
                            prev.includes(pr.id) ? prev.filter(id => id !== pr.id) : [...prev, pr.id]
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-zinc-900 text-white border-zinc-900' 
                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{pr.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Account Status</label>
                <select
                  value={newUserStatus}
                  onChange={e => setNewUserStatus(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-300 font-medium text-zinc-800 bg-white"
                >
                  <option value="Active">Approved (Ready for First Login)</option>
                  <option value="Inactive">Pending Activation</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  [ Create Account ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Provisioned Success Modal */}
      {provisionedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Account Provisioned!</h3>
                <p className="text-xs text-zinc-500">Provide these credentials to the user</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Full Name</span>
                <span className="font-bold text-zinc-900">{provisionedNotice.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Email Address</span>
                <span className="font-mono text-zinc-800">{provisionedNotice.email}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Temporary Password</span>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-zinc-200 font-mono font-bold text-zinc-900 mt-0.5">
                  <span>{provisionedNotice.tempPass}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(provisionedNotice.tempPass);
                      setCopiedKey('prov');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-sans text-xs font-semibold cursor-pointer"
                  >
                    {copiedKey === 'prov' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
              ⚠️ User will be forced to change this temporary password upon first login before accessing CRM data.
            </div>

            <button
              type="button"
              onClick={() => setProvisionedNotice(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Password Reset Notice Modal */}
      {resetPassNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Password Reset</h3>
                <p className="text-xs text-zinc-500">New temporary password generated</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">User</span>
                <span className="font-bold text-zinc-900">{resetPassNotice.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Temporary Password</span>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-zinc-200 font-mono font-bold text-zinc-900 mt-0.5">
                  <span>{resetPassNotice.tempPass}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPassNotice.tempPass);
                      setCopiedKey('reset');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-sans text-xs font-semibold cursor-pointer"
                  >
                    {copiedKey === 'reset' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResetPassNotice(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
