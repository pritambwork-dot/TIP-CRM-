import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { AppleDock } from './components/AppleDock';
import { NavTab } from './types';
import { TopBar } from './components/TopBar';
import type { QuickActionType } from './components/QuickActionModal';
import { LoginPage } from './components/auth/LoginPage';
import { GoogleSignInModal } from './components/auth/GoogleSignInModal';
import { SupabaseAuthEngine } from './lib/supabase';
import { clearUserOfflineCache } from './lib/offlineStorage';
import { ErrorBoundary, ViewLoadingSkeleton } from './components/common';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';

// Route-based code-split lazy views for low-bandwidth and fast initial paint
const DashboardView = React.lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const PeopleView = React.lazy(() => import('./components/views/PeopleView').then(m => ({ default: m.PeopleView })));
const OrganizationsView = React.lazy(() => import('./components/views/OrganizationsView').then(m => ({ default: m.OrganizationsView })));
const ProgramsView = React.lazy(() => import('./components/views/ProgramsView').then(m => ({ default: m.ProgramsView })));
const EventsView = React.lazy(() => import('./components/views/EventsView').then(m => ({ default: m.EventsView })));
const TasksView = React.lazy(() => import('./components/views/TasksView').then(m => ({ default: m.TasksView })));
const FundingView = React.lazy(() => import('./components/views/FundingView').then(m => ({ default: m.FundingView })));
const ReportsView = React.lazy(() => import('./components/views/ReportsView').then(m => ({ default: m.ReportsView })));
const DocumentsView = React.lazy(() => import('./components/views/DocumentsView').then(m => ({ default: m.DocumentsView })));
const SettingsView = React.lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const IntelligenceView = React.lazy(() => import('./components/views/IntelligenceView').then(m => ({ default: m.IntelligenceView })));

// Lazy-loaded modals and ancillary views
const LandingPage = React.lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const FirstLoginPasswordModal = React.lazy(() => import('./components/auth/FirstLoginPasswordModal').then(m => ({ default: m.FirstLoginPasswordModal })));
const WelcomeOnboardingModal = React.lazy(() => import('./components/auth/WelcomeOnboardingModal').then(m => ({ default: m.WelcomeOnboardingModal })));
const GlobalSearchModal = React.lazy(() => import('./components/GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));
const QuickActionModal = React.lazy(() => import('./components/QuickActionModal').then(m => ({ default: m.QuickActionModal })));
const ImportModal = React.lazy(() => import('./components/ImportModal').then(m => ({ default: m.ImportModal })));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
const TipIntelligenceDrawer = React.lazy(() => import('./components/intelligence/TipIntelligenceDrawer').then(m => ({ default: m.TipIntelligenceDrawer })));
const MobileNavDrawer = React.lazy(() => import('./components/navigation/MobileNavDrawer').then(m => ({ default: m.MobileNavDrawer })));

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
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Check for existing session or OAuth callback on mount
  useEffect(() => {
    // Purge legacy auto-login session keys to prevent dirty session leaks
    localStorage.removeItem('tip_crm_auth_session');
    localStorage.removeItem('tip_crm_auth_user_id');

    const verifyAuthOnMount = async () => {
      // 1. Process OAuth callback if arriving from Google redirect (PKCE code or OAuth error)
      const callbackResult = await SupabaseAuthEngine.handleOAuthCallback();
      if (callbackResult.error) {
        setAuthError(callbackResult.error);
        setIsAuthenticated(false);
        setInitialCheckDone(true);
        return;
      }

      // 2. Resolve active Supabase user identity (from newly exchanged callback session or existing session)
      let supabaseUser: { id: string; email: string; fullName?: string; avatarUrl?: string } | null = null;
      if (callbackResult.session?.user) {
        supabaseUser = callbackResult.session.user;
      } else {
        supabaseUser = await SupabaseAuthEngine.getActiveSupabaseUser();
      }

      try {
        if (supabaseUser?.email) {
          const targetEmail = supabaseUser.email.toLowerCase().trim();
          let matchedUser = users.find(u => u.email.toLowerCase().trim() === targetEmail);

          // Explicitly bind Google login for authorized administrator to Super Admin
          if (!matchedUser && (targetEmail === 'tipcrm090@theinclusionproject.ca' || targetEmail === 'admin@theinclusionproject.ca')) {
            matchedUser = users.find(u => u.id === 'u-admin-090' || u.id === 'u-1') || users[0];
          }

          if (!matchedUser) {
            // Unapproved Google identity: revoke session and display access denial
            await SupabaseAuthEngine.signOut();
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setAuthError(`Your Google account (${targetEmail}) was authenticated, but no approved TIP CRM profile was found. Please contact your administrator to request access.`);
            setIsAuthenticated(false);
            setInitialCheckDone(true);
            return;
          }

          if (matchedUser.status === 'rejected') {
            await SupabaseAuthEngine.signOut();
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setAuthError('This account request was not approved. Please contact your CRM Administrator.');
            setIsAuthenticated(false);
            setInitialCheckDone(true);
            return;
          }

          if (matchedUser.status === 'disabled' || (matchedUser.status !== 'pending' && matchedUser.isActive === false)) {
            await SupabaseAuthEngine.signOut();
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setAuthError('Your account has been deactivated. Please contact your CRM Administrator.');
            setIsAuthenticated(false);
            setInitialCheckDone(true);
            return;
          }

          if (matchedUser.status === 'pending' || matchedUser.adminApproved === false) {
            await SupabaseAuthEngine.signOut();
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setAuthError('Your account is pending activation by an Administrator. Please check back later.');
            setIsAuthenticated(false);
            setInitialCheckDone(true);
            return;
          }

          // Approved active user: assign role, activate session
          if (currentUser?.id !== matchedUser.id) {
            switchUser(matchedUser.id);
          }
          localStorage.setItem(AUTH_STORAGE_KEY, 'active');
          localStorage.setItem(AUTH_USER_KEY, matchedUser.id);
          setIsAuthenticated(true);
          setInitialCheckDone(true);
          return;
        }
      } catch {
        // Fallback to local session check
      }

      // 3. Local session check
      const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      const savedUserId = localStorage.getItem(AUTH_USER_KEY);

      if (savedSession === 'active' && savedUserId) {
        const matchedUser = users.find(u => u.id === savedUserId);
        if (
          matchedUser && 
          matchedUser.status !== 'disabled' && 
          matchedUser.status !== 'rejected' && 
          matchedUser.status !== 'pending' &&
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
    };

    verifyAuthOnMount();
  }, [users, currentUser?.id, switchUser]);


  const handleEmailSignIn = useCallback((input: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);

    // Simulate async auth check
    setTimeout(() => {
      const normalizedInput = input.toLowerCase().trim();
      const isAdminLogin = normalizedInput === 'tipcrm090' ||
                           normalizedInput === 'tipcrm090@theinclusionproject.ca' ||
                           normalizedInput === 'admin@theinclusionproject.ca';

      let matchedUser = users.find(u => 
        u.email.toLowerCase().trim() === normalizedInput || 
        u.id.toLowerCase() === normalizedInput
      );

      // Explicitly bind authorized administrator credentials to Super Admin
      if (isAdminLogin) {
        matchedUser = users.find(u => u.id === 'u-admin-090' || u.id === 'u-1' || u.email === 'tipcrm090@theinclusionproject.ca') || users[0];
      }

      if (!matchedUser) {
        setAuthError('No account found with that email or ID. Please check your credentials or contact your administrator.');
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

      // Exact password check for TIPCRM090 / primary admin
      if (isAdminLogin) {
        if (password !== 'CRM090') {
          const isProd = (import.meta as any).env?.PROD;
          setAuthError(isProd ? 'Invalid email or password.' : 'Incorrect password. For TIPCRM090, please enter password: CRM090');
          setAuthLoading(false);
          return;
        }
      } else if (matchedUser.mustChangePassword && matchedUser.tempPassword) {
        // Check temporary password for admin-provisioned users
        if (password !== matchedUser.tempPassword) {
          setAuthError('Incorrect temporary password. Please enter the temporary password provided by your admin.');
          setAuthLoading(false);
          return;
        }
      } else {
        // Standard password length validation
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

  const handleGoogleSignIn = useCallback(async (email?: string, name?: string) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await SupabaseAuthEngine.signInWithGoogle(email, name);
      if (res.error) {
        setAuthError(res.error);
        setAuthLoading(false);
        return;
      }

      // If redirected to Google OAuth URL (res.url returned or window navigated), retain loading state
      if (res.url) {
        return;
      }

      // If session returned directly (testing / local verified identity)
      const sessionUser = res.session?.user;
      if (sessionUser) {
        const targetEmail = sessionUser.email.toLowerCase().trim();
        let matchedUser = users.find(u => u.email.toLowerCase().trim() === targetEmail);

        // Explicitly bind authorized administrator emails to Super Admin
        if (!matchedUser && (targetEmail === 'tipcrm090@theinclusionproject.ca' || targetEmail === 'admin@theinclusionproject.ca')) {
          matchedUser = users.find(u => u.id === 'u-admin-090' || u.id === 'u-1') || users[0];
        }

        if (!matchedUser) {
          await SupabaseAuthEngine.signOut();
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          setAuthError(`Your Google account (${targetEmail}) was authenticated, but no approved TIP CRM profile was found. Please contact your administrator to request access.`);
          setAuthLoading(false);
          return;
        }

        if (matchedUser.status === 'rejected') {
          await SupabaseAuthEngine.signOut();
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          setAuthError('This account request was not approved. Please contact your CRM Administrator.');
          setAuthLoading(false);
          return;
        }

        if (matchedUser.status === 'disabled' || (matchedUser.status !== 'pending' && matchedUser.isActive === false)) {
          await SupabaseAuthEngine.signOut();
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          setAuthError('Your account has been deactivated. Please contact your CRM Administrator.');
          setAuthLoading(false);
          return;
        }

        if (matchedUser.status === 'pending' || matchedUser.adminApproved === false) {
          await SupabaseAuthEngine.signOut();
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          setAuthError('Your account is pending activation by an Administrator. Please check back later.');
          setAuthLoading(false);
          return;
        }

        // Successfully authenticated approved user
        switchUser(matchedUser.id);
        localStorage.setItem(AUTH_STORAGE_KEY, 'active');
        localStorage.setItem(AUTH_USER_KEY, matchedUser.id);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Google authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  }, [users, switchUser]);

  const handleLogout = useCallback(async () => {
    const currentUserId = currentUser?.id || localStorage.getItem(AUTH_USER_KEY);
    try {
      await SupabaseAuthEngine.signOut();
      if (typeof fetch !== 'undefined') {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
      if (currentUserId) {
        await clearUserOfflineCache(currentUserId).catch(() => {});
      }
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem('tip_crm_supabase_auth_session');
      try {
        sessionStorage.clear();
      } catch {}
      setIsAuthenticated(false);
      setShowLogin(false);
      setAuthError(null);
    }
  }, [currentUser?.id]);

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
      return (
        <React.Suspense fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-[#FBFBFA]">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        }>
          <LandingPage 
            onOpenLogin={() => setShowLogin(true)} 
            onGoogleSignIn={() => setShowGoogleModal(true)}
          />
          <GoogleSignInModal
            isOpen={showGoogleModal}
            onClose={() => setShowGoogleModal(false)}
            onSelectAccount={(selectedEmail, selectedName) => {
              setShowGoogleModal(false);
              handleGoogleSignIn(selectedEmail, selectedName);
            }}
            users={users}
            loading={authLoading}
            error={authError}
          />
        </React.Suspense>
      );
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
      <React.Suspense fallback={null}>
        <FirstLoginPasswordModal
          user={currentUser}
          onSubmit={completeFirstLoginPasswordChange}
          onSuccess={() => {}}
          onLogout={handleLogout}
        />
      </React.Suspense>
    );
  }

  // Clone children and render Welcome Onboarding if pending
  return (
    <>
      {currentUser && currentUser.onboardingCompleted === false && (
        <React.Suspense fallback={null}>
          <WelcomeOnboardingModal
            user={currentUser}
            onComplete={completeOnboarding}
          />
        </React.Suspense>
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
  const { currentUser } = useCrm();
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
    } else if (type === 'program') {
      setActiveTab('programs');
    } else if (type === 'task') {
      setActiveTab('tasks');
    } else if (type === 'funding') {
      setActiveTab('funding');
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
    programs: 'Programs & Cohorts',
    events: 'Events & Attendance',
    tasks: 'Tasks & Follow-ups',
    funding: 'Donors & Funding',
    reports: 'Board & Funder Reports',
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
              <ErrorBoundary
                key={activeTab}
                fallbackTitle={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Notice`}
                fallbackMessage={`A rendering issue occurred while loading the ${activeTab} section. Your records remain completely safe. Click Retry to reload this section.`}
              >
                <React.Suspense fallback={<ViewLoadingSkeleton title={sectionTitles[activeTab]} />}>
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
                      onOpenImport={() => setImportOpen(true)}
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
                      onSelectPerson={(id) => handleNavigate('people', id)}
                      onSelectProgram={(id) => handleNavigate('programs', id)}
                    />
                  )}

                  {activeTab === 'funding' && (
                    <FundingView
                      onSelectPerson={(id) => handleNavigate('people', id)}
                      onSelectProgram={(id) => handleNavigate('programs', id)}
                    />
                  )}

                  {activeTab === 'reports' && (
                    <ReportsView />
                  )}

                  {activeTab === 'intelligence' && (
                    <IntelligenceView />
                  )}

                  {activeTab === 'documents' && (
                    <DocumentsView />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsView
                      onOpenImport={() => setImportOpen(true)}
                    />
                  )}
                </React.Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals loaded lazily on demand */}
      <React.Suspense fallback={null}>
        {searchOpen && (
          <GlobalSearchModal
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onNavigate={handleNavigate}
          />
        )}

        {quickActionOpen && (
          <QuickActionModal
            isOpen={quickActionOpen}
            onClose={() => setQuickActionOpen(false)}
            onTriggerAction={handleQuickAction}
            initialMode={quickActionInitialMode}
            initialPersonId={quickActionPersonId}
            onNavigateToPerson={(personId) => handleNavigate('people', personId)}
          />
        )}

        {importOpen && (
          <ImportModal
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
          />
        )}

        {onboardingOpen && (
          <OnboardingModal
            isOpen={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            onNavigate={handleNavigate}
            onOpenImport={() => setImportOpen(true)}
          />
        )}

        {/* TIP Intelligence Proactive Work Companion Drawer */}
        <TipIntelligenceDrawer
          currentView={activeTab}
          onNavigate={(tab, id) => handleNavigate(tab as NavTab, id)}
        />

        {/* Mobile Navigation Drawer (Full CRM menu + role switching + workflow guide) */}
        {mobileDrawerOpen && (
          <MobileNavDrawer
            isOpen={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            activeTab={activeTab}
            onTabChange={handleNavigate}
            onOpenOnboarding={() => setOnboardingOpen(true)}
            onLogout={onLogout}
          />
        )}
      </React.Suspense>

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
