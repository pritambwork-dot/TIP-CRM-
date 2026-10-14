import React, { useState } from 'react';
import { Shield, ArrowRight, LogOut, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { AuthSession } from '../../types';

interface AccessRequestScreenProps {
  session: AuthSession;
  onRequestAccess: (notes?: string, customName?: string) => void;
  onSignOut: () => void;
  loading?: boolean;
}

export const AccessRequestScreen: React.FC<AccessRequestScreenProps> = ({
  session,
  onRequestAccess,
  onSignOut,
  loading = false
}) => {
  const [fullName, setFullName] = useState(session.user.fullName || '');
  const [roleNotes, setRoleNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestAccess(roleNotes.trim(), fullName.trim());
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col justify-between text-zinc-900 selection:bg-zinc-900 selection:text-white antialiased">
      {/* Header */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-zinc-200/70 bg-[#FAF9F6]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center font-serif font-bold text-sm tracking-wider shadow-xs">
            T
          </div>
          <span className="font-serif font-semibold text-zinc-900 tracking-tight text-base">The Inclusion Project</span>
        </div>
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </header>

      {/* Main Content — strictly matches Prompt Section 6 */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-6 sm:p-8">
            {/* Identity Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 mb-6">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google identity verified</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-serif text-zinc-900 mb-2">
              ACCESS REQUEST
            </h1>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Your Google account has been verified. TIP CRM access requires administrator approval before your role and data access are activated.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                  Verified Account
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-mono text-zinc-700 select-all">
                  {session.user.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Thompson"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Organization / Role Note (Optional)
                </label>
                <input
                  type="text"
                  value={roleNotes}
                  onChange={(e) => setRoleNotes(e.target.value)}
                  placeholder="e.g. Youth Initiative Coordinator, Workshop Volunteer"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                />
              </div>

              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Request Access</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer transition-colors"
                >
                  Sign out and use another account
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-zinc-400 border-t border-zinc-200/50">
        The Inclusion Project · Identity verified via Supabase Auth
      </footer>
    </div>
  );
};
