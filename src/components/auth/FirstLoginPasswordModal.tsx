import React, { useState, useMemo } from 'react';
import { 
  KeyRound, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle,
  Lock,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../../types';

interface FirstLoginPasswordModalProps {
  user: UserProfile;
  onSubmit: (currentTempPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
  onLogout: () => void;
}

export const FirstLoginPasswordModal: React.FC<FirstLoginPasswordModalProps> = ({
  user,
  onSubmit,
  onSuccess,
  onLogout
}) => {
  const [currentTemp, setCurrentTemp] = useState(user.tempPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time validation criteria
  const checks = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
      diffFromTemp: currentTemp.length > 0 && newPassword !== currentTemp
    };
  }, [newPassword, confirmPassword, currentTemp]);

  const isValid = 
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasNumber &&
    checks.hasSpecial &&
    checks.passwordsMatch &&
    checks.diffFromTemp &&
    currentTemp.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    const result = await onSubmit(currentTemp, newPassword);
    setSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMsg(result.error || 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-title"
      >
        {/* Header with TIP Branding */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold text-amber-400">Security Gate</span>
                <p className="text-sm text-zinc-300">The Inclusion Project CRM</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
              First Login
            </span>
          </div>

          <h2 id="first-login-title" className="text-2xl font-bold text-white tracking-tight">
            Set Your CRM Password
          </h2>
          <p className="text-sm text-zinc-300 mt-1">
            Welcome, <strong className="text-white font-medium">{user.name}</strong>. Your account was provisioned with a temporary password. Choose a new password to access your workspace.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Temporary Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Temporary Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentTemp}
                onChange={e => setCurrentTemp(e.target.value)}
                required
                placeholder="Enter current temporary password"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="Create new password"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Password Security Requirements</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              <div className={`flex items-center gap-1.5 ${checks.minLength ? 'text-emerald-700' : 'text-zinc-500'}`}>
                {checks.minLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                <span>8+ characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.hasUpper ? 'text-emerald-700' : 'text-zinc-500'}`}>
                {checks.hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                <span>Uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.hasLower ? 'text-emerald-700' : 'text-zinc-500'}`}>
                {checks.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                <span>Lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.hasNumber ? 'text-emerald-700' : 'text-zinc-500'}`}>
                {checks.hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.hasSpecial ? 'text-emerald-700' : 'text-zinc-500'}`}>
                {checks.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                <span>Special char (!@#$%^&*)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.passwordsMatch ? 'text-emerald-700' : 'text-zinc-500'}`}>
                {checks.passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                <span>Passwords match</span>
              </div>
            </div>
            {currentTemp && newPassword === currentTemp && (
              <p className="text-[11px] text-amber-600 font-medium pt-1">
                ⚠️ New password must be different from temporary password.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className={`w-full sm:flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                isValid && !submitting
                  ? 'bg-zinc-900 text-white hover:bg-black cursor-pointer'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Securing Account...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Set Password & Activate</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-100 text-center text-xs text-zinc-400">
          The Inclusion Project · Non-Profit Operational Data & Access Governance
        </div>
      </div>
    </div>
  );
};
