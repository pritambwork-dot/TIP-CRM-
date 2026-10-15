import React, { useState, useRef, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CloudUpload, 
  AlertTriangle, 
  CheckCircle2,
  X
} from 'lucide-react';
import { useSyncStatus } from '../../lib/syncEngine';

interface SyncStatusIndicatorProps {
  userId?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ userId }) => {
  const { 
    state, 
    isOnline, 
    pendingCount, 
    conflictCount, 
    lastSyncedAt, 
    lastError,
    syncNow 
  } = useSyncStatus(userId);

  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Never synced in this session';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
  };

  // Badges & styling per status
  const getBadgeConfig = () => {
    if (!isOnline) {
      return {
        bg: 'bg-amber-500/10 text-amber-700 border-amber-200/60 dark:border-amber-800/40',
        dot: 'bg-amber-500',
        icon: <WifiOff className="w-3.5 h-3.5 text-amber-600" />,
        label: 'Offline (Safe)',
        shortLabel: 'Offline'
      };
    }
    if (state === 'syncing' || isManualSyncing) {
      return {
        bg: 'bg-blue-500/10 text-blue-700 border-blue-200/60 dark:border-blue-800/40',
        dot: 'bg-blue-500 animate-ping',
        icon: <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />,
        label: 'Syncing...',
        shortLabel: 'Syncing'
      };
    }
    if (conflictCount > 0) {
      return {
        bg: 'bg-rose-500/10 text-rose-700 border-rose-200/60 dark:border-rose-800/40',
        dot: 'bg-rose-500',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
        label: `${conflictCount} Conflict`,
        shortLabel: 'Conflict'
      };
    }
    if (pendingCount > 0) {
      return {
        bg: 'bg-amber-500/10 text-amber-800 border-amber-200/60 dark:border-amber-800/40',
        dot: 'bg-amber-500',
        icon: <CloudUpload className="w-3.5 h-3.5 text-amber-600" />,
        label: `${pendingCount} Pending`,
        shortLabel: `${pendingCount}p`
      };
    }
    return {
      bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50 dark:border-emerald-800/40',
      dot: 'bg-emerald-500',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'Online',
      shortLabel: 'Online'
    };
  };

  const config = getBadgeConfig();

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Connection status: ${config.label}. Click for details.`}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-90 cursor-pointer ${config.bg}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`rounded-full h-2 w-2 ${config.dot}`} />
        </span>
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">{config.shortLabel}</span>
      </button>

      {isOpen && (
        <div 
          role="dialog"
          aria-label="Offline Sync & Connectivity Status"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-card border border-border shadow-xl p-4 z-50 text-foreground animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              {config.icon}
              <h4 className="text-xs font-bold tracking-tight uppercase">Network & Sync</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Close sync status"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network Connection:</span>
              <span className="font-semibold flex items-center gap-1">
                {isOnline ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600 inline" />
                    Offline Mode
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending Changes:</span>
              <span className="font-semibold">{pendingCount} operation(s)</span>
            </div>

            {conflictCount > 0 && (
              <div className="flex items-center justify-between text-rose-600">
                <span>Version Conflicts:</span>
                <span className="font-bold">{conflictCount} item(s)</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Synchronized:</span>
              <span className="font-medium text-foreground">{formatLastSync(lastSyncedAt)}</span>
            </div>

            {lastError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200/50">
                {lastError}
              </p>
            )}

            <div className="bg-muted/40 p-2.5 rounded-lg text-[11px] text-muted-foreground leading-relaxed">
              {isOnline
                ? 'Your CRM is synchronized with the server. All modifications are backed up.'
                : 'You are working offline. Any edits, contacts, and notes are safely queued in local storage and will sync automatically when your internet connection returns.'}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex justify-end gap-2">
            <button
              type="button"
              disabled={!isOnline || isManualSyncing || state === 'syncing'}
              onClick={handleManualSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
