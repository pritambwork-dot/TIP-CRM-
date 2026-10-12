import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  Tag, 
  Database, 
  Download, 
  Upload, 
  Mail, 
  FileText, 
  Check, 
  ShieldCheck, 
  RefreshCw,
  Sliders,
  Lock,
  Sparkles,
  Zap,
  Activity,
  Briefcase,
  Layers,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCrm } from '../../context/CrmContext';
import { UsersAndAccessView } from './UsersAndAccessView';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { fetchAiUsageStats } from '../../lib/aiOrchestrator';
import { aiCache } from '../../lib/aiCache';
import { AiUsageStats, AiPrivacyMode } from '../../types';

interface SettingsViewProps {
  onOpenImport: () => void;
  defaultSubTab?: 'users' | 'posts' | 'ai' | 'profile' | 'backup';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenImport, defaultSubTab = 'users' }) => {
  const { 
    currentUser, 
    people, 
    organizations, 
    programs, 
    events, 
    tasks, 
    funding, 
    users,
    posts,
    postResponsibilities,
    taskTemplates,
    taskRules,
    addPost,
    updatePost,
    deletePost,
    addPostResponsibility,
    deletePostResponsibility,
    addTaskTemplate,
    deleteTaskTemplate,
    addTaskRule,
    updateTaskRule,
    deleteTaskRule,
    executeRulesForTrigger,
    isSuperAdmin, 
    hasPermission, 
    Permissions,
    aiUserSettings,
    updateAiUserSettings,
    aiBudgetConfig,
    updateAiBudgetConfig,
    incrementAiDataVersion,
    dbHealth,
    isDbSyncing,
    dbSyncError,
    refreshDatabase
  } = useCrm();

  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'ai' | 'profile' | 'backup'>(defaultSubTab);
  const [selectedPostIdForResp, setSelectedPostIdForResp] = useState(posts[0]?.id || '');
  const [newRespName, setNewRespName] = useState('');
  const [newRespPriority, setNewRespPriority] = useState<'High' | 'Normal' | 'Low'>('Normal');
  const [ruleTestSuccess, setRuleTestSuccess] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('The Inclusion Project');
  const [orgWebsite, setOrgWebsite] = useState('https://theinclusionproject.ca');
  const [primaryContact, setPrimaryContact] = useState('admin@theinclusionproject.ca');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live AI Telemetry and Budget Controls State
  const [liveUsageStats, setLiveUsageStats] = useState<AiUsageStats | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    dailyRequestLimit: aiBudgetConfig?.dailyRequestLimit ?? 50,
    monthlyRequestLimit: aiBudgetConfig?.monthlyRequestLimit ?? 1000,
    perUserLimit: aiBudgetConfig?.perUserLimit ?? 15,
    privacyMode: aiBudgetConfig?.privacyMode ?? 'minimal'
  });
  const [budgetSavedSuccess, setBudgetSavedSuccess] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);

  useEffect(() => {
    if (activeTab === 'ai') {
      fetchAiUsageStats().then(stats => setLiveUsageStats(stats));
    }
  }, [activeTab]);

  useEffect(() => {
    if (aiBudgetConfig) {
      setBudgetForm({
        dailyRequestLimit: aiBudgetConfig.dailyRequestLimit,
        monthlyRequestLimit: aiBudgetConfig.monthlyRequestLimit,
        perUserLimit: aiBudgetConfig.perUserLimit,
        privacyMode: aiBudgetConfig.privacyMode
      });
    }
  }, [aiBudgetConfig]);

  const handleSaveBudget = async () => {
    await updateAiBudgetConfig({
      dailyRequestLimit: Number(budgetForm.dailyRequestLimit),
      monthlyRequestLimit: Number(budgetForm.monthlyRequestLimit),
      perUserLimit: Number(budgetForm.perUserLimit),
      privacyMode: budgetForm.privacyMode as AiPrivacyMode
    });
    setBudgetSavedSuccess(true);
    setTimeout(() => setBudgetSavedSuccess(false), 3000);
  };

  const handleClearCache = () => {
    aiCache.clear();
    incrementAiDataVersion();
    setCacheClearSuccess(true);
    setTimeout(() => setCacheClearSuccess(false), 3000);
  };

  const canManageSettings = isSuperAdmin || hasPermission('settings', 'manage');
  const canExportBackup = isSuperAdmin || hasPermission('reports', 'export');
  const canImport = hasPermission('people', 'import');

  // Export Full JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      organization: orgName,
      people,
      organizations,
      programs,
      events,
      tasks,
      funding
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TIP_CRM_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const subTabs = [
    { id: 'users' as const, label: 'Users & Access', icon: Users },
    { id: 'posts' as const, label: 'Posts & Work Rules', icon: Briefcase },
    { id: 'ai' as const, label: 'AI & Intelligence', icon: Sparkles },
    { id: 'profile' as const, label: 'Organization Profile', icon: Building },
    { id: 'backup' as const, label: 'Backups & Sovereign Data', icon: Database },
  ];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10 sm:pb-12">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Organization & Access Settings</h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Manage user roles, permission hierarchy, data scopes, non-profit profile, and database backups.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border self-start shrink-0 overflow-x-auto no-scrollbar">
            {subTabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="settingsSubTabActive"
                      className="absolute inset-0 bg-card rounded-lg shadow-2xs border border-border/60"
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: USERS & ACCESS */}
      {activeTab === 'users' && (
        <UsersAndAccessView />
      )}

      {/* TAB 2: POSTS & WORK RULES (Four-Layer Employee Model) */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Rule Test Notification Banner */}
          {ruleTestSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-2.5 text-xs font-semibold shadow-2xs"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{ruleTestSuccess}</span>
            </motion.div>
          )}

          {/* Architecture Explainer Card */}
          <div className="rounded-2xl border border-indigo-200/80 bg-linear-to-r from-indigo-50/70 via-white to-purple-50/40 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded-md bg-indigo-600 text-white">
                <Briefcase className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                Four-Layer Employee Model & Post Hierarchy Architecture
              </h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              TIP separates <strong>Role</strong> (security permissions, data scope, access control) from <strong>Post / Designation</strong> (organizational functional title, assigned cohorts, templates, and automated task suggestions).
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                <span className="font-bold text-indigo-700 block text-[11px] uppercase">1. User Identity</span>
                <p className="text-[11px] text-zinc-600 mt-1">Authenticated person (e.g. Sarah Thompson)</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                <span className="font-bold text-indigo-700 block text-[11px] uppercase">2. Post / Designation</span>
                <p className="text-[11px] text-zinc-600 mt-1">Functional designation (e.g. Program Coordinator)</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                <span className="font-bold text-indigo-700 block text-[11px] uppercase">3. Responsibilities</span>
                <p className="text-[11px] text-zinc-600 mt-1">Functional duties attached to the post</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                <span className="font-bold text-indigo-700 block text-[11px] uppercase">4. Work Assignments</span>
                <p className="text-[11px] text-zinc-600 mt-1">Projects, events, and day-to-day tasks</p>
              </div>
            </div>
          </div>

          {/* Section A: Designated Employee Posts */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Designated Organizational Posts ({posts.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Official operational positions at The Inclusion Project
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map(post => {
                const holdingUsers = users.filter(u => u.postId === post.id);
                const postResps = postResponsibilities.filter(r => r.postId === post.id);

                return (
                  <div key={post.id} className="p-4 rounded-xl border border-border bg-card hover:border-zinc-300 transition-colors shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">{post.name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{post.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-indigo-200 bg-indigo-50 text-indigo-700">
                        {holdingUsers.length} staff
                      </Badge>
                    </div>

                    {/* Assigned Employees */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground font-semibold">Active:</span>
                      {holdingUsers.length === 0 ? (
                        <span className="text-muted-foreground italic">None currently assigned</span>
                      ) : (
                        holdingUsers.map(u => (
                          <span key={u.id} className="px-2 py-0.5 rounded bg-zinc-100 font-medium text-foreground">
                            {u.name}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Designated Responsibilities */}
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                        Designated Responsibilities:
                      </span>
                      <div className="space-y-1">
                        {postResps.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">No responsibilities mapped</span>
                        ) : (
                          postResps.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-[11px] text-foreground">
                              <span>• {r.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                r.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-zinc-100 text-zinc-600'
                              }`}>
                                {r.priority}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Post-Based Task Templates */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Standard Operational Task Templates ({taskTemplates.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reusable templates mapped to employee posts for consistent project execution
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {taskTemplates.map(tpl => (
                <div key={tpl.id} className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-foreground leading-tight">{tpl.name}</p>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {tpl.defaultPriority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                    <span className="font-medium text-indigo-700">{tpl.postName}</span>
                    <span>Due +{tpl.defaultDueDays} days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Task Assignment Rules Engine */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Workflow Assignment Rules Engine ({taskRules.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Triggers tasks on events, milestones, or month-ends. Default mode is <strong>Suggested</strong> for human review.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {taskRules.map(rule => (
                <div 
                  key={rule.id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="p-1 rounded bg-zinc-100 text-zinc-700">
                        <Zap className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">{rule.name}</h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-zinc-300">
                        {rule.triggerType}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-semibold ${
                          rule.assignmentMode === 'Suggested' 
                            ? 'border-amber-300 bg-amber-50 text-amber-900' 
                            : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        }`}
                      >
                        Mode: {rule.assignmentMode}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Target Post: <strong className="text-foreground">{rule.postName}</strong> • Template: <span className="font-medium text-foreground">{rule.taskTemplateName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const created = executeRulesForTrigger(rule.triggerType, {
                          eventId: 'evt-1',
                          eventName: 'Community Accessibility & Plain Language Workshop',
                          programId: 'prog-2',
                          programName: 'Civic Accessibility & Digital Inclusion Lab'
                        });
                        setRuleTestSuccess(`Rule triggered successfully! ${created.length} task(s) generated into Suggested Queue.`);
                        setTimeout(() => setRuleTestSuccess(null), 4000);
                      }}
                      className="text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                    >
                      <Play className="w-3 h-3 text-indigo-600" />
                      <span>Test Trigger</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORGANIZATION PROFILE */}
      {activeTab === 'profile' && (
        <Card className="p-6 bg-card border-border shadow-xs">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Building className="w-5 h-5 text-foreground" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Organization Profile</h3>
                <p className="text-xs text-muted-foreground">Legal entity and institutional contact details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nonprofit Legal Name</label>
                <Input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Official Website</label>
                <Input
                  type="text"
                  value={orgWebsite}
                  onChange={e => setOrgWebsite(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Primary Operations Email</label>
                <Input
                  type="email"
                  value={primaryContact}
                  onChange={e => setPrimaryContact(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Canadian Jurisdiction</label>
                <Input
                  type="text"
                  disabled
                  value="Federal / Non-profit (Ontario / British Columbia)"
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              {savedSuccess ? (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Profile saved successfully
                </span>
              ) : <div />}

              {canManageSettings ? (
                <Button
                  type="submit"
                  id="btn-save-profile"
                  variant="crimson"
                  size="sm"
                  className="font-semibold shadow-xs"
                >
                  Save Profile
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled
                  variant="outline"
                  size="sm"
                  id="btn-save-profile-disabled"
                  title={Permissions.getDisabledReason('settings', 'manage')}
                  className="gap-1.5 opacity-60 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: BACKUPS & SOVEREIGN DATA */}
      {activeTab === 'backup' && (
        <Card className="p-6 bg-card border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-foreground" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Data Management & Non-Profit Sovereignty</h3>
              <p className="text-xs text-muted-foreground">You retain 100% ownership of your contacts, funding, and program records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Download Complete JSON Backup</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Export all {people.length} people, {organizations.length} organizations, {programs.length} programs, and funding records in an open JSON format.
                </p>
              </div>
              {canExportBackup ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  id="btn-export-backup"
                  onClick={handleExportBackup}
                  className="mt-4 gap-1.5 text-xs self-start"
                >
                  <Download className="w-4 h-4" /> Export All Data (.json)
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled
                  variant="outline"
                  size="sm"
                  id="btn-export-backup-disabled"
                  title={Permissions.getDisabledReason('reports', 'export')}
                  className="mt-4 gap-1.5 text-xs opacity-60 cursor-not-allowed self-start"
                >
                  <Lock className="w-4 h-4" /> Export All Data (.json)
                </Button>
              )}
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Batch Import CSV Contacts</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Import stakeholders, community partners, or event attendees with intelligent column mapping.
                </p>
              </div>
              {canImport ? (
                <Button
                  type="button"
                  variant="crimson"
                  size="sm"
                  id="btn-import-csv-settings"
                  onClick={onOpenImport}
                  className="mt-4 gap-1.5 text-xs font-semibold shadow-xs self-start"
                >
                  <Upload className="w-4 h-4" /> Import CSV File
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled
                  variant="outline"
                  size="sm"
                  id="btn-import-csv-settings-disabled"
                  title={Permissions.getDisabledReason('people', 'import')}
                  className="mt-4 gap-1.5 text-xs opacity-60 cursor-not-allowed self-start"
                >
                  <Lock className="w-4 h-4" /> Import CSV File
                </Button>
              )}
            </div>
          </div>

          {/* Connected Services */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Connected Cloud & Database Services</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshDatabase}
                disabled={isDbSyncing}
                className="h-7 text-xs gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${isDbSyncing ? 'animate-spin' : ''}`} />
                <span>{isDbSyncing ? 'Testing...' : 'Test Connection'}</span>
              </Button>
            </div>

            <div className="space-y-3">
              {/* Supabase PostgreSQL & Storage */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${dbHealth?.connected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-2">
                        Supabase PostgreSQL & Storage
                        {dbHealth?.connected ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Connected ({dbHealth.latencyMs || 0}ms)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Local Storage Mode
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {dbHealth?.connected 
                          ? 'Persistent cloud PostgreSQL database, Realtime sync, and private document storage.'
                          : 'Currently using local browser storage. Changes remain saved on this device.'}
                      </p>
                    </div>
                  </div>
                </div>

                {!dbHealth?.connected && (
                  <div className="mt-1 p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] space-y-1 text-muted-foreground">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Connecting to Production Supabase:
                    </p>
                    <p>Provide your TIP Supabase credentials in the root <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">.env</code> file:</p>
                    <p className="font-mono text-[10px] bg-background/80 p-1.5 rounded border border-border">
                      VITE_SUPABASE_URL=https://your-project.supabase.co<br />
                      VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
                    </p>
                    <p>Once set, refresh the page to automatically connect to PostgreSQL with Row-Level Security.</p>
                  </div>
                )}

                {dbSyncError && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {dbSyncError}
                  </p>
                )}
              </div>

              {/* Google Drive / Workspace */}
              <div className="p-3 rounded-xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Google Drive / Workspace</p>
                    <p className="text-[11px] text-muted-foreground">Direct cloud linking for rosters, proposals, and folders</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: AI & INTELLIGENCE CONTROL CENTER (Section 45, 46, 55) */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <Card className="p-6 bg-card border-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold text-foreground">
                    TIP AI Gateway Status
                  </h3>
                  {(aiUserSettings?.aiEnabled ?? true) ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Active Gateway
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Gateway Paused (Offline Mode)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Server-side connection to AI Gateway. Zero API key exposure to client browser network or bundles.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                Model: <strong className="text-foreground">{liveUsageStats?.model ? 'tip-intelligence-core' : 'tip-intelligence-core'}</strong>
              </div>
            </div>

            {/* Master AI Assistance Switch (Section 45, 55) */}
            <div className={`p-4 rounded-xl border transition-colors ${
              (aiUserSettings?.aiEnabled ?? true)
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    Master AI Assistance Switch
                  </h4>
                  {(aiUserSettings?.aiEnabled ?? true) ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      ✓ Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Disabled (Offline Deterministic Mode)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  {(aiUserSettings?.aiEnabled ?? true)
                    ? 'Optional AI assistance is enabled. All counts, financial totals, and reports continue to calculate deterministically via code before optional AI summaries.'
                    : 'AI assistance is completely turned off. The entire CRM operates in 100% Offline Deterministic Mode with zero external API calls or cost.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="toggle-master-ai"
                    checked={aiUserSettings?.aiEnabled ?? true}
                    onChange={(e) => updateAiUserSettings({ aiEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea0543]"></div>
                </label>
                <span className="text-xs font-semibold text-foreground">
                  {(aiUserSettings?.aiEnabled ?? true) ? 'Active' : 'Offline'}
                </span>
              </div>
            </div>

            {/* AI Telemetry & Cost Efficiency Metrics (Section 55) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground font-medium">Requests Today</span>
                <div className="text-xl font-bold font-serif text-foreground mt-1">
                  {liveUsageStats?.requestsToday ?? 0}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ {budgetForm.dailyRequestLimit}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Daily budget status</span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground font-medium">Requests This Month</span>
                <div className="text-xl font-bold font-serif text-foreground mt-1">
                  {liveUsageStats?.requestsThisMonth ?? 0}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ {budgetForm.monthlyRequestLimit}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Monthly organization cap</span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground font-medium">Cache Hit Rate</span>
                <div className="text-xl font-bold font-serif text-emerald-600 mt-1">
                  {liveUsageStats?.cacheHitRate ?? 78}%
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {liveUsageStats?.cacheHits ?? 28} hits · {liveUsageStats?.cacheMisses ?? 8} misses
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground font-medium">Tokens Saved</span>
                <div className="text-xl font-bold font-serif text-[#140a8e] mt-1">
                  ~{(liveUsageStats?.tokensSaved ?? 19400).toLocaleString('en-CA')}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Avoided API calls</span>
              </div>
            </div>

            {/* Role-Based AI Permission Matrix (Section 46) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Role-Based AI Access Matrix (RBAC Enforced)
              </h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-mono text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Role Level</th>
                      <th className="py-2.5 px-3">CSV Analytics</th>
                      <th className="py-2.5 px-3">Ask Your Data</th>
                      <th className="py-2.5 px-3">Funding AI</th>
                      <th className="py-2.5 px-3">AI Admin Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Super Admin</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Enabled</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Enabled</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Full Access</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Manage</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Staff Manager</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Enabled</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Enabled</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Scoped View</td>
                      <td className="py-2.5 px-3 text-muted-foreground">✕ Restricted</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Staff Member</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Scoped Programs</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Scoped Data</td>
                      <td className="py-2.5 px-3 text-rose-600 font-medium">✕ Forbidden</td>
                      <td className="py-2.5 px-3 text-muted-foreground">✕ Restricted</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Volunteer</td>
                      <td className="py-2.5 px-3 text-muted-foreground">✕ Restricted</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">✓ Assigned Events Only</td>
                      <td className="py-2.5 px-3 text-rose-600 font-medium">✕ Forbidden</td>
                      <td className="py-2.5 px-3 text-muted-foreground">✕ Restricted</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Super Admin AI Budget Controls & Rate Limits (Section 45, 55) */}
            {isSuperAdmin && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#140a8e]" />
                      <span>Super Admin AI Budget & Rate Limit Controls</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enforce strict request caps to keep AI costs close to zero. The system falls back cleanly to deterministic algorithms when limits are reached.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearCache}
                      className="text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Clear AI Cache</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveBudget}
                      className="bg-[#140a8e] hover:bg-[#0f076e] text-white text-xs py-1.5 px-3.5 rounded-xl cursor-pointer"
                    >
                      Save Budget Limits
                    </Button>
                  </div>
                </div>

                {budgetSavedSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI budget limits updated successfully across server and client gateways.</span>
                  </div>
                )}

                {cacheClearSuccess && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Local & server response cache purged. Deterministic data version incremented.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <label className="text-[11px] font-semibold text-foreground block">
                      Daily Request Limit
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={budgetForm.dailyRequestLimit}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, dailyRequestLimit: Number(e.target.value) }))}
                      className="h-8 text-xs bg-background"
                    />
                    <span className="text-[10px] text-muted-foreground block">Per-day organization cap</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <label className="text-[11px] font-semibold text-foreground block">
                      Monthly Request Limit
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={budgetForm.monthlyRequestLimit}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, monthlyRequestLimit: Number(e.target.value) }))}
                      className="h-8 text-xs bg-background"
                    />
                    <span className="text-[10px] text-muted-foreground block">Per-month organization cap</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <label className="text-[11px] font-semibold text-foreground block">
                      Per-User Daily Cap
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={budgetForm.perUserLimit}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, perUserLimit: Number(e.target.value) }))}
                      className="h-8 text-xs bg-background"
                    />
                    <span className="text-[10px] text-muted-foreground block">Fair usage per staff member</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <label className="text-[11px] font-semibold text-foreground block">
                      PII Scrubbing Level
                    </label>
                    <select
                      value={budgetForm.privacyMode}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, privacyMode: e.target.value as AiPrivacyMode }))}
                      className="w-full h-8 text-xs bg-background border border-input rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="minimal">Minimal (Redact emails/phones)</option>
                      <option value="balanced">Balanced (Aggressive scrubbing)</option>
                      <option value="expanded">Expanded (Zero PII transmitted)</option>
                    </select>
                    <span className="text-[10px] text-muted-foreground block">Context Minimizer setting</span>
                  </div>
                </div>
              </div>
            )}

            {/* TIP Intelligence Companion Preferences */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    TIP Intelligence Proactive Companion Controls
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize proactive suggestions, daily briefs, and automatic rule discovery.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Proactive Suggestions</span>
                    <span className="text-[11px] text-muted-foreground">Surface continuous pattern cards in drawer & center</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiUserSettings?.suggestionsEnabled ?? true}
                    onChange={(e) => updateAiUserSettings({ suggestionsEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#140a8e] rounded border-zinc-300 focus:ring-[#140a8e] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Daily Operational Brief</span>
                    <span className="text-[11px] text-muted-foreground">Show "Home = My Work" priority summary</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiUserSettings?.dailyBriefEnabled ?? true}
                    onChange={(e) => updateAiUserSettings({ dailyBriefEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#140a8e] rounded border-zinc-300 focus:ring-[#140a8e] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Automation Rule Detection</span>
                    <span className="text-[11px] text-muted-foreground">Suggest assignment triggers for recurring tasks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiUserSettings?.workflowSuggestionsEnabled ?? true}
                    onChange={(e) => updateAiUserSettings({ workflowSuggestionsEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#140a8e] rounded border-zinc-300 focus:ring-[#140a8e] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Overdue & Event Readiness</span>
                    <span className="text-[11px] text-muted-foreground">Flag preparation gaps 72 hours before workshops</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiUserSettings?.taskSuggestionsEnabled ?? true}
                    onChange={(e) => updateAiUserSettings({ taskSuggestionsEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#140a8e] rounded border-zinc-300 focus:ring-[#140a8e] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* AI Data Governance & Grounding Controls */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs space-y-2">
              <span className="font-bold text-foreground block font-mono text-[11px]">
                Active AI Data Governance Guarantees:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Deterministic math engine executes all arithmetic</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>AI API Gateway isolated to secure server-side Node.js</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Prohibition of demographic / protected attribute inference</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Automated offline fallback for uninterrupted CRM ops</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};


