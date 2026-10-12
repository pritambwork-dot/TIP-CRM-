import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { AppleDock } from './components/AppleDock';
import { NavTab } from './types';
import { TopBar } from './components/TopBar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { QuickActionModal, QuickActionType } from './components/QuickActionModal';
import { ImportModal } from './components/ImportModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ShieldCheck } from 'lucide-react';
import { Button } from './components/ui/button';
import { LoginPage } from './components/auth/LoginPage';
import { FirstLoginPasswordModal } from './components/auth/FirstLoginPasswordModal';
import { WelcomeOnboardingModal } from './components/auth/WelcomeOnboardingModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { PeopleView } from './components/views/PeopleView';
import { OrganizationsView } from './components/views/OrganizationsView';
import { ProgramsView } from './components/views/ProgramsView';
import { EventsView } from './components/views/EventsView';
import { TasksView } from './components/views/TasksView';
import { FundingView } from './components/views/FundingView';
import { ReportsView } from './components/views/ReportsView';
import { DocumentsView } from './components/views/DocumentsView';
import { SettingsView } from './components/views/SettingsView';
import { IntelligenceView } from './components/views/IntelligenceView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { LandingPage } from './components/landing/LandingPage';
import { TipIntelligenceDrawer } from './components/intelligence/TipIntelligenceDrawer';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { MobileNavDrawer } from './components/navigation/MobileNavDrawer';

// Auth storage keys
const AUTH_STORAGE_KEY = 'tip_crm_auth_session_v2';
const AUTH_USER_KEY = 'tip_crm_auth_user_id_v2';

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * AuthGate wraps the CRM and gates access behind email + password login.
 * On successful login, stores session in localStorage so refresh preserves login.
 */
const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { users, currentUser, switchUser, completeFirstLoginPasswordChange, completeOnboarding } = useCrm();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Check for existing session on mount (run strictly once on mount)
  useEffect(() => {
    // Purge legacy auto-login session keys to prevent dirty session leaks
    localStorage.removeItem('tip_crm_auth_session');
    localStorage.removeItem('tip_crm_auth_user_id');

    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    const savedUserId = localStorage.getItem(AUTH_USER_KEY);

    if (savedSession === 'active' && savedUserId) {
      const matchedUser = users.find(u => u.id === savedUserId);
      if (
        matchedUser && 
        matchedUser.status !== 'disabled' && 
        matchedUser.status !== 'rejected' && 
        matchedUser.isActive !== false
      ) {
        if (currentUser?.id !== matchedUser.id) {
          switchUser(matchedUser.id);
        }
        setIsAuthenticated(true);
      } else {
        // Stale or revoked session
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setIsAuthenticated(false);
      }
    } else {
      // STRICT NON-LEAK: Unauthenticated visitors MUST explicitly log in
      setIsAuthenticated(false);
    }
    setInitialCheckDone(true);
  }, []);


  const handleEmailSignIn = useCallback((email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);

    // Simulate async auth check
    setTimeout(() => {
      const normalizedEmail = email.toLowerCase().trim();
      const matchedUser = users.find(u => u.email.toLowerCase().trim() === normalizedEmail);

      if (!matchedUser) {
        setAuthError('No account found with that email. Please check your email or contact your administrator.');
        setAuthLoading(false);
        return;
      }

      // Account Status Checks (Section 29)
      if (matchedUser.status === 'disabled' || matchedUser.isActive === false) {
        setAuthError('Your account has been deactivated. Please contact your CRM Administrator.');
        setAuthLoading(false);
        return;
      }

      if (matchedUser.status === 'rejected') {
        setAuthError('This account request was not approved. Please contact your CRM Administrator.');
        setAuthLoading(false);
        return;
      }

      if (matchedUser.status === 'pending') {
        setAuthError('Your account is pending activation by an Administrator. Please check back later.');
        setAuthLoading(false);
        return;
      }

      // Check temporary password for admin-provisioned users
      if (matchedUser.mustChangePassword && matchedUser.tempPassword) {
        if (password !== matchedUser.tempPassword) {
          setAuthError('Incorrect temporary password. Please enter the temporary password provided by your admin.');
          setAuthLoading(false);
          return;
        }
      } else {
        // Standard password validation (minimum length check)
        if (password.length < 4) {
          setAuthError('Password must be at least 4 characters.');
          setAuthLoading(false);
          return;
        }
      }

      // Successful login
      switchUser(matchedUser.id);
      localStorage.setItem(AUTH_STORAGE_KEY, 'active');
      localStorage.setItem(AUTH_USER_KEY, matchedUser.id);
      setIsAuthenticated(true);
      setAuthLoading(false);
    }, 600);
  }, [users, switchUser]);

  const handleGoogleSignIn = useCallback((email?: string, name?: string) => {
    setAuthLoading(true);
    setAuthError(null);

    setTimeout(() => {
      const targetEmail = (email || '').toLowerCase().trim();
      let matchedUser = users.find(u => u.email.toLowerCase().trim() === targetEmail);

      // Default to root administrator if no email provided or ruth's email
      if (!matchedUser && (!targetEmail || targetEmail === 'ruth@theinclusionproject.com')) {
        matchedUser = users.find(u => u.id === 'u-1') || users[0];
      }

      if (matchedUser) {
        if (matchedUser.status === 'disabled' || matchedUser.isActive === false) {
          setAuthError('Your account has been deactivated. Please contact your CRM Administrator.');
          setAuthLoading(false);
          return;
        }
        if (matchedUser.status === 'pending') {
          setAuthError('Your account is pending activation by an Administrator.');
          setAuthLoading(false);
          return;
        }
        if (matchedUser.status === 'rejected') {
          setAuthError('This account request was declined.');
          setAuthLoading(false);
          return;
        }

        switchUser(matchedUser.id);
        localStorage.setItem(AUTH_STORAGE_KEY, 'active');
        localStorage.setItem(AUTH_USER_KEY, matchedUser.id);
        setIsAuthenticated(true);
      } else {
        setAuthError(`No CRM account is linked to ${targetEmail}. Contact your admin to request access.`);
      }
      setAuthLoading(false);
    }, 600);
  }, [users, switchUser]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setIsAuthenticated(false);
    setShowLogin(false);
    setAuthError(null);
  }, []);

  // Show nothing during initial session check to avoid flash
  if (!initialCheckDone) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!showLogin) {
      return <LandingPage onOpenLogin={() => setShowLogin(true)} />;
    }

    return (
      <LoginPage
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onBackToLanding={() => setShowLogin(false)}
        loading={authLoading}
        error={authError}
      />
    );
  }

  // Mandatory First Login Password Change Gate (Section 6 & 29)
  if (currentUser?.mustChangePassword) {
    return (
      <FirstLoginPasswordModal
        user={currentUser}
        onSubmit={completeFirstLoginPasswordChange}
        onSuccess={() => {}}
        onLogout={handleLogout}
      />
    );
  }

  // Clone children and render Welcome Onboarding if pending
  return (
    <>
      {currentUser && currentUser.onboardingCompleted === false && (
        <WelcomeOnboardingModal
          user={currentUser}
          onComplete={completeOnboarding}
        />
      )}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onLogout: handleLogout });
        }
        return child;
      })}
    </>
  );
};

const MainLayout: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { currentUser, canViewFunding, hasPermission } = useCrm();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Modals
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [quickActionInitialMode, setQuickActionInitialMode] = useState<'menu' | 'quick_note'>('menu');
  const [quickActionPersonId, setQuickActionPersonId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleOpenQuickAction = () => {
    setQuickActionInitialMode('menu');
    setQuickActionPersonId(null);
    setQuickActionOpen(true);
  };

  const handleOpenQuickNote = (personId?: string) => {
    setQuickActionInitialMode('quick_note');
    setQuickActionPersonId(personId || null);
    setQuickActionOpen(true);
  };

  // Selected records for drill-down across views
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFundingId, setSelectedFundingId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Keyboard shortcut for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if first-time user
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('tip_crm_onboarding_seen');
    if (!hasSeenOnboarding) {
      setOnboardingOpen(true);
      localStorage.setItem('tip_crm_onboarding_seen', 'true');
    }
  }, []);

  const handleNavigate = (tab: NavTab, recordId?: string) => {
    setActiveTab(tab);

    if (tab === 'people' && recordId) setSelectedPersonId(recordId);
    if (tab === 'organizations' && recordId) setSelectedOrgId(recordId);
    if (tab === 'programs' && recordId) setSelectedProgramId(recordId);
    if (tab === 'events' && recordId) setSelectedEventId(recordId);
    if (tab === 'tasks' && recordId) setSelectedTaskId(recordId);
    if (tab === 'funding' && recordId) setSelectedFundingId(recordId);
    if (tab === 'documents' && recordId) setSelectedDocId(recordId);
  };

  const handleQuickAction = (type: QuickActionType) => {
    if (type === 'quick_note') {
      handleOpenQuickNote();
      return;
    } else if (type === 'person') {
      setActiveTab('people');
      setTimeout(() => {
        const btn = document.getElementById('btn-add-person');
        if (btn) btn.click();
      }, 50);
    } else if (type === 'event') {
      setActiveTab('events');
      setTimeout(() => {
        const btn = document.getElementById('btn-create-event');
        if (btn) btn.click();
      }, 50);
    } else if (type === 'program') {
      setActiveTab('programs');
      setTimeout(() => {
        const btn = document.getElementById('btn-create-program');
        if (btn) btn.click();
      }, 50);
    } else if (type === 'task') {
      setActiveTab('tasks');
      setTimeout(() => {
        const btn = document.getElementById('btn-add-task');
        if (btn) btn.click();
      }, 50);
    } else if (type === 'funding') {
      if (canViewFunding) {
        setActiveTab('funding');
        setTimeout(() => {
          const btn = document.getElementById('btn-add-funding');
          if (btn) btn.click();
        }, 50);
      }
    } else if (type === 'interaction') {
      setActiveTab('people');
      setSelectedPersonId('p-1');
    } else if (type === 'document') {
      setActiveTab('programs');
      setSelectedProgramId('prog-1');
    }
  };

  const sectionTitles: Record<NavTab, string> = {
    dashboard: 'Operational Dashboard',
    people: 'People & Relationships',
    organizations: 'Partner Organizations',
    programs: 'Programs & Projects',
    events: 'Events & Attendance',
    tasks: 'Tasks & Follow-ups',
    funding: 'Donors & Funding',
    reports: 'Reports & Exports',
    intelligence: 'AI Intelligence & CSV Analytics',
    documents: 'Documents & Links',
    settings: 'Organization Settings'
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col bg-[#FBFBFA] text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white relative">
      {/* Top Header */}
      <TopBar
        currentSectionTitle={sectionTitles[activeTab] || 'TIP CRM'}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenQuickAction={handleOpenQuickAction}
        onOpenImport={() => setImportOpen(true)}
        onSelectTask={(taskId: string) => {
          setActiveTab('tasks');
        }}
        onNavigate={handleNavigate}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onLogout={onLogout}
      />

      {/* Main Body Layout: Left Sidebar Apple Dock + Workspace Canvas */}
      <div className="flex-1 flex flex-row overflow-hidden relative w-full">
        {/* Animated Apple-Style Left Sidebar Dock */}
        <AppleDock
          activeTab={activeTab}
          onTabChange={(tab: NavTab) => setActiveTab(tab)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenQuickAction={handleOpenQuickAction}
          onOpenOnboarding={() => setOnboardingOpen(true)}
        />

        {/* Main Workspace Canvas with Apple Fluid View Transition */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-12 w-full max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  onNavigate={handleNavigate}
                  onOpenQuickAction={handleOpenQuickAction}
                  onOpenQuickNote={handleOpenQuickNote}
                />
              )}

              {activeTab === 'people' && (
                <PeopleView
                  selectedPersonId={selectedPersonId}
                  onSelectPerson={setSelectedPersonId}
                  onNavigateToProgram={(id) => handleNavigate('programs', id)}
                />
              )}

              {activeTab === 'organizations' && (
                <OrganizationsView
                  selectedOrgId={selectedOrgId}
                  onSelectOrg={setSelectedOrgId}
                  onSelectPerson={(id) => handleNavigate('people', id)}
                />
              )}

              {activeTab === 'programs' && (
                <ProgramsView
                  selectedProgramId={selectedProgramId}
                  onSelectProgram={setSelectedProgramId}
                  onSelectPerson={(id) => handleNavigate('people', id)}
                  onSelectEvent={(id) => handleNavigate('events', id)}
                />
              )}

              {activeTab === 'events' && (
                <EventsView
                  selectedEventId={selectedEventId}
                  onSelectEvent={setSelectedEventId}
                  onSelectPerson={(id) => handleNavigate('people', id)}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksView
                  selectedTaskId={selectedTaskId}
                  onSelectPerson={(id) => handleNavigate('people', id)}
                  onSelectProgram={(id) => handleNavigate('programs', id)}
                />
              )}

              {activeTab === 'funding' && (
                canViewFunding && hasPermission('funding', 'view') ? (
                  <FundingView
                    selectedFundingId={selectedFundingId}
                    onSelectPerson={(id) => handleNavigate('people', id)}
                    onSelectProgram={(id) => handleNavigate('programs', id)}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900">Access Restricted</h3>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Funding &amp; Grant records contain confidential financial data restricted to Administrators and authorized project leads.
                    </p>
                    <div className="mt-5">
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('dashboard')}>
                        Return to Dashboard
                      </Button>
                    </div>
                  </div>
                )
              )}

              {activeTab === 'reports' && (
                hasPermission('reports', 'view') ? (
                  <ReportsView />
                ) : (
                  <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900">Access Restricted</h3>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      You do not have permission to view organizational reports and analytics exports.
                    </p>
                    <div className="mt-5">
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('dashboard')}>
                        Return to Dashboard
                      </Button>
                    </div>
                  </div>
                )
              )}

              {activeTab === 'intelligence' && (
                <ErrorBoundary fallbackTitle="CSV Analytics & Intelligence Notice" fallbackMessage="An error occurred while rendering the Intelligence view. Your data is safe. Click Retry to reload.">
                  <IntelligenceView />
                </ErrorBoundary>
              )}

              {activeTab === 'documents' && (
                <DocumentsView
                  selectedDocId={selectedDocId}
                />
              )}

              {activeTab === 'settings' && (
                hasPermission('settings', 'view') ? (
                  <SettingsView
                    onOpenImport={() => setImportOpen(true)}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900">Access Restricted</h3>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Organizational settings and user management are restricted to CRM Administrators.
                    </p>
                    <div className="mt-5">
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('dashboard')}>
                        Return to Dashboard
                      </Button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onTriggerAction={handleQuickAction}
        initialMode={quickActionInitialMode}
        initialPersonId={quickActionPersonId}
        onNavigateToPerson={(personId) => handleNavigate('people', personId)}
      />

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
      />

      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onNavigate={handleNavigate}
        onOpenImport={() => setImportOpen(true)}
      />

      {/* TIP Intelligence Proactive Work Companion Drawer */}
      <TipIntelligenceDrawer
        currentView={activeTab}
        onNavigate={(tab, id) => handleNavigate(tab as NavTab, id)}
      />

      {/* Mobile Navigation Drawer (Full CRM menu + role switching + workflow guide) */}
      <MobileNavDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={handleNavigate}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onLogout={onLogout}
      />

      {/* Mobile Bottom Navigation Bar (Thumb friendly, hidden on md+) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleNavigate}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
        onOpenQuickAction={handleOpenQuickAction}
      />
    </div>
  );
};

export default function App() {
  return (
    <CrmProvider>
      <AuthGate>
        <MainLayout />
      </AuthGate>
    </CrmProvider>
  );
}
