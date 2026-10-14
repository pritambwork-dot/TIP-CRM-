import React from 'react';
import { Ban, LogOut } from 'lucide-react';
import { AuthSession } from '../../types';

interface AccountDisabledScreenProps {
  session?: AuthSession | null;
  onSignOut: () => void;
}

export const AccountDisabledScreen: React.FC<AccountDisabledScreenProps> = ({
  session,
  onSignOut
}) => {
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

      {/* Main Container — Exact copy from Section 11 */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-8 sm:p-10 text-center">
            {/* Status Icon */}
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-6">
              <Ban className="w-6 h-6 text-rose-600" />
            </div>

            <h1 className="text-xl sm:text-2xl font-serif font-normal text-zinc-900 tracking-tight mb-3">
              ACCOUNT DISABLED
            </h1>

            <p className="text-sm text-zinc-600 mb-6 leading-relaxed max-w-sm mx-auto">
              Your TIP CRM access has been disabled.
            </p>

            <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
              Please contact your administrator.
            </p>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-zinc-400 border-t border-zinc-200/50">
        The Inclusion Project · Identity & Access Security
      </footer>
    </div>
  );
};
