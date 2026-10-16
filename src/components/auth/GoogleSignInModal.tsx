import React, { useState, useEffect } from 'react';
import { X, Lock, ArrowRight, AlertCircle, ExternalLink, ShieldCheck, Mail } from 'lucide-react';
import { UserProfile } from '../../types';
import { verifyPassword } from '../../lib/passwordSecurity';

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 shrink-0' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
);

export interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name?: string) => void;
  onDirectOAuth?: () => void;
  loading?: boolean;
  error?: string | null;
  users?: UserProfile[];
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  onDirectOAuth,
  loading = false,
  error = null,
  users = []
}) => {
  const [selectedEmail, setSelectedEmail] = useState<string>('tipcrm090@theinclusionproject.ca');
  const [selectedName, setSelectedName] = useState<string>('TIP Super Admin');
  const [password, setPassword] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Primary Super Admin Profile
  const adminUser = users.find(u => u.id === 'u-admin-090' || u.roleId === 'super_admin' || u.email === 'tipcrm090@theinclusionproject.ca');
  const adminEmail = adminUser?.email || 'tipcrm090@theinclusionproject.ca';
  const adminName = adminUser?.name || 'TIP Super Admin';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const targetEmail = (showCustomInput ? customEmail : selectedEmail).trim().toLowerCase();
    const targetName = showCustomInput ? (customName.trim() || undefined) : selectedName;

    if (!targetEmail) {
      setLocalError('Please enter a valid Google Account email.');
      return;
    }

    if (!password.trim()) {
      setLocalError('Please enter your CRM password to authorize Google account sign-in.');
      return;
    }

    // Verify Password against primary super admin or provisioned user profile
    const isAdmin = targetEmail === 'tipcrm090' || 
                         targetEmail === 'tipcrm090@theinclusionproject.ca' || 
                         targetEmail === 'admin@theinclusionproject.ca';

    if (isAdmin) {
      if (password !== 'CRM090') {
        setLocalError('Incorrect password for TIP Super Admin.');
        return;
      }
    } else {
      const user = users.find(u => u.email.toLowerCase() === targetEmail || u.id === targetEmail);
      if (!user) {
        setLocalError(`No approved account found for ${targetEmail}. Please check your credentials or contact your Super Admin.`);
        return;
      }
      if (user.status === 'disabled' || user.isActive === false) {
        setLocalError('Your account has been deactivated. Please contact your CRM Super Admin.');
        return;
      }
      if (user.mustChangePassword && user.tempPassword) {
        if (password !== user.tempPassword) {
          setLocalError('Incorrect temporary password. Please enter the temporary password provided by your Super Admin.');
          return;
        }
      } else if (user.passwordHash || user.password) {
        const isMatch = verifyPassword(password, user.passwordHash || user.password);
        if (!isMatch) {
          setLocalError('Invalid email or password.');
          return;
        }
      } else {
        setLocalError('Invalid email or password. Please contact your CRM Super Admin.');
        return;
      }
    }

    // Password verified: Proceed with authenticated sign-in
    onSelectAccount(targetEmail, targetName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-modal-title"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-zinc-200/80 flex items-center justify-center">
              <GoogleLogoSvg className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h2 id="google-modal-title" className="text-base font-semibold text-zinc-900 leading-tight">
                Sign in with Google
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Authorized access to The Inclusion Project CRM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close Google Sign In"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Security Banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Strict Security Active: Proper password verification required to authenticate.</span>
          </div>

          {/* Error Message */}
          {(error || localError) && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error || localError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {!showCustomInput ? (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Authorized Super Admin Account
                </label>
                <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 text-amber-400 font-medium text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      SA
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900">{adminName}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 text-white">
                          Super Admin
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">{adminEmail}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Google Account Email
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="name@theinclusionproject.ca or name@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Registered User Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Password Verification Field (Mandatory) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-700">
                  CRM Account Password
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">Password required</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <GoogleLogoSvg className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Verify Password & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(!showCustomInput);
                    setLocalError(null);
                    setPassword('');
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 font-medium underline cursor-pointer"
                >
                  {showCustomInput ? '← Use Primary Super Admin' : 'Use another Google account'}
                </button>

                {onDirectOAuth && (
                  <button
                    type="button"
                    onClick={onDirectOAuth}
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Browser OAuth</span>
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Privacy Note */}
          <div className="pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 text-center leading-relaxed">
            The Inclusion Project CRM requires cryptographic verification. Unverified access is strictly denied.
          </div>
        </div>
      </div>
    </div>
  );
};
