import React, { useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';

interface LoginPageProps {
  onGoogleSignIn: (email?: string, name?: string) => void;
  onEmailSignIn: (email: string, pass: string) => void;
  onEmailSignUp?: (email: string, pass: string, name: string) => void;
  onBackToLanding?: () => void;
  loading?: boolean;
  error?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onGoogleSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onBackToLanding,
  loading = false,
  error = null
}) => {
  const { users } = useCrm();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'custom_google'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (authMode === 'signup') {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        setLocalError('Please complete all registration fields.');
        return;
      }
      if (onEmailSignUp) {
        onEmailSignUp(email, password, fullName);
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setLocalError('Please enter both your email address and CRM password.');
        return;
      }
      onEmailSignIn(email, password);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) {
      setLocalError('Please enter a valid Google Account email.');
      return;
    }
    onGoogleSignIn(customGoogleEmail.trim(), customGoogleName.trim() || undefined);
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col justify-between selection:bg-zinc-900 selection:text-white antialiased text-zinc-900">
      {/* Subtle Top Bar */}
      <header className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-zinc-200/70 bg-[#FAF9F6]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer pr-2.5 border-r border-zinc-200 transition-colors"
            >
              ← Landing
            </button>
          )}
          <img
            src="/tip-logo.svg"
            alt="The Inclusion Project"
            className="h-9 sm:h-10 w-auto object-contain"
          />
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-medium border-l border-zinc-300 pl-2 ml-0.5">CRM</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Secure Gateway
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-auto">
        <div className="w-full max-w-md">
          {/* Hero Typography */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <img
                src="/tip-logo.svg"
                alt="The Inclusion Project"
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-zinc-900 tracking-tight mb-2">
              CRM Portal
            </h1>
            <p className="text-sm sm:text-base text-zinc-500 font-normal leading-relaxed max-w-sm mx-auto">
              A workspace for people, programs and community impact.
            </p>
          </div>

          {/* Card Container */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-6 sm:p-8 transition-all">
            {/* Display Error Message */}
            {(error || localError) && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error || localError}</span>
              </div>
            )}

            {authMode === 'custom_google' ? (
              /* Custom Google Identity Testing */
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-4">
                <div className="text-left mb-2">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Google OAuth Identity Verification
                  </div>
                  <p className="text-xs text-zinc-600">
                    Enter any Google email to simulate identity verification and test the Access Approval flow:
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Google Account Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Thompson"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Verify with Google Identity</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setLocalError(null); }}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
                  >
                    Back to Standard Sign In
                  </button>
                </div>
              </form>
            ) : (
              /* Standard Auth Flow */
              <>
                {/* 1. Primary Google OAuth Action */}
                <button
                  type="button"
                  id="btn-google-login"
                  disabled={loading}
                  onClick={() => setShowGoogleModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-800 text-sm font-medium transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.13C3.27 21.39 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.61H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.39l4.02-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.61l4.02 3.13c.95-2.84 3.6-4.99 6.72-4.99z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Google Account Chooser Modal */}
                {showGoogleModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-sm rounded-2xl border border-zinc-200 shadow-xl overflow-hidden p-6 text-left">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100">
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.13C3.27 21.39 7.35 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.61H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.39l4.02-3.13z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.61l4.02 3.13c.95-2.84 3.6-4.99 6.72-4.99z"
                          />
                        </svg>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">Sign in with Google</h3>
                          <p className="text-xs text-zinc-500">Choose an account for TIP CRM</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {/* Account 1: Pritam */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGoogleModal(false);
                            onGoogleSignIn('pritam@theinclusionproject.ca', 'Pritam');
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center shrink-0">
                            P
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                              Pritam
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              pritam@theinclusionproject.ca
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Executive Director & Super Admin
                            </div>
                          </div>
                        </button>

                        {/* Account 2: Divyanshaa */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGoogleModal(false);
                            onGoogleSignIn('divyanshaa@theinclusionproject.ca', 'Divyanshaa');
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center shrink-0">
                            D
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                              Divyanshaa
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              divyanshaa@theinclusionproject.ca
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Operations & Programs Lead
                            </div>
                          </div>
                        </button>

                        {/* Account 3: Use another account */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGoogleModal(false);
                            setAuthMode('custom_google');
                          }}
                          className="w-full py-2 px-3 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors text-center cursor-pointer font-medium"
                        >
                          Use another Google account
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowGoogleModal(false)}
                        className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200"></div>
                  </div>
                  <span className="relative px-3 bg-white text-xs font-normal text-zinc-400 lowercase">
                    or
                  </span>
                </div>

                {/* 2. Secondary Email + CRM Password Form */}
                <form onSubmit={handleSubmitEmail} className="space-y-4 text-left">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      User ID or Email
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="pritam or divyanshaa"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-zinc-700">
                        Password
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">Demo: rkumar07</span>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="rkumar07"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    id="btn-email-signin"
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>{authMode === 'signup' ? 'Submit CRM Registration' : 'Sign in'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Test Persona Fillers for V1 Staging / Role Testing */}
                  {authMode === 'signin' && (
                    <div className="mt-4 pt-3 border-t border-zinc-100">
                      <p className="text-[11px] font-semibold text-zinc-500 mb-2">Demo Accounts (One-Click Sign In):</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setEmail('pritam');
                            setPassword('rkumar07');
                          }}
                          className="py-2 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 text-center font-medium transition-colors cursor-pointer flex flex-col items-center"
                        >
                          <span className="font-semibold text-zinc-900">Pritam</span>
                          <span className="text-[10px] text-zinc-500">Super Admin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail('divyanshaa');
                            setPassword('rkumar07');
                          }}
                          className="py-2 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 text-center font-medium transition-colors cursor-pointer flex flex-col items-center"
                        >
                          <span className="font-semibold text-zinc-900">Divyanshaa</span>
                          <span className="text-[10px] text-zinc-500">Staff Lead</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Footer Switch */}
                <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-col items-center gap-2 text-xs">
                  {authMode === 'signin' ? (
                    <div className="text-zinc-500">
                      Don't have access yet?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setLocalError(null); }}
                        className="text-zinc-900 font-medium hover:underline cursor-pointer"
                      >
                        Request access
                      </button>
                    </div>
                  ) : (
                    <div className="text-zinc-500">
                      Already have an approved account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signin'); setLocalError(null); }}
                        className="text-zinc-900 font-medium hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Trust & Security Footnote */}
      <footer className="w-full py-4 text-center text-xs text-zinc-400 border-t border-zinc-200/50">
        The Inclusion Project (TIP) · Canadian Nonprofit · Protected by Supabase Auth & PostgreSQL Row-Level Security
      </footer>
    </div>
  );
};
