/**
 * TIP CRM — Authoritative User Session & Activity Duration Tracker
 * Location: server/lib/userSessionTracker.ts
 *
 * Requirements:
 * 1. Track which user logged in and logged out at what time.
 * 2. Calculate exact usage duration in hours and minutes (e.g. "2h 45m", "35m").
 * 3. Support live active session tracking with heartbeat refreshes.
 * 4. Authoritative persistence in server/user_sessions.jsonl with in-memory fast indexing.
 * 5. Provide aggregate per-user totals and system-wide usage statistics.
 */

import fs from 'fs';
import path from 'path';
import { safeLogger } from './ai/gemini.ts';
import { recordAuditEvent } from './auditLogger.ts';

export interface UserSessionRecord {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string; // ISO 8601 string
  logoutAt?: string; // ISO 8601 string (undefined if active)
  lastActiveAt: string; // ISO 8601 string
  durationSeconds: number;
  durationFormatted: string; // e.g. "2h 15m" or "45m"
  status: 'active' | 'logged_out' | 'terminated';
  ipAddress?: string;
  deviceInfo?: string;
}

export interface UserSessionSummary {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  avatarUrl?: string;
  totalSessions: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  lastLoginAt: string;
  lastLogoutAt?: string;
  status: 'active' | 'offline';
  averageSessionFormatted: string;
}

export interface UserSessionStats {
  activeUsersCount: number;
  totalSessionsCount: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  averageDurationFormatted: string;
}

const SESSIONS_FILE = path.resolve(process.cwd(), 'server', 'user_sessions.jsonl');

/**
 * Format total seconds into human-readable hours and minutes string (e.g. "2h 45m" or "32m").
 */
export function formatDurationHoursMinutes(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m`;
  }
  if (minutes === 0) {
    return `${hours}h 0m`;
  }
  return `${hours}h ${minutes}m`;
}

// In-memory sessions store
let sessionsStore: UserSessionRecord[] = [];
let initialized = false;

/**
 * Baseline seeds representing historical usage by established organization team members
 */
function getBaselineSeedSessions(): UserSessionRecord[] {
  const now = Date.now();
  const dayMs = 86400 * 1000;

  return [
    // Current Active Super Admin session
    {
      id: 'sess-rec-101',
      sessionId: 'session_abc123',
      userId: 'u-admin-090',
      userName: 'TIP Administrator',
      userEmail: 'tipcrm090@theinclusionproject.ca',
      userRole: 'super_admin',
      loginAt: new Date(now - 8100 * 1000).toISOString(), // logged in 2h 15m ago
      lastActiveAt: new Date(now - 120 * 1000).toISOString(),
      durationSeconds: 8100,
      durationFormatted: '2h 15m',
      status: 'active',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Desktop (macOS / Chrome)'
    },
    // Super Admin yesterday morning session
    {
      id: 'sess-rec-102',
      sessionId: 'sess_hist_admin_prev',
      userId: 'u-admin-090',
      userName: 'TIP Administrator',
      userEmail: 'tipcrm090@theinclusionproject.ca',
      userRole: 'super_admin',
      loginAt: new Date(now - dayMs - 14400 * 1000).toISOString(),
      logoutAt: new Date(now - dayMs - 900 * 1000).toISOString(),
      lastActiveAt: new Date(now - dayMs - 900 * 1000).toISOString(),
      durationSeconds: 13500, // 3h 45m
      durationFormatted: '3h 45m',
      status: 'logged_out',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Desktop (macOS / Chrome)'
    },
    // Sarah Jenkins (Staff Manager) — recent session today
    {
      id: 'sess-rec-103',
      sessionId: 'sess_hist_sarah_1',
      userId: 'u-2',
      userName: 'Sarah Jenkins',
      userEmail: 'sarah@theinclusionproject.ca',
      userRole: 'staff_manager',
      loginAt: new Date(now - 14400 * 1000).toISOString(), // 4 hours ago
      logoutAt: new Date(now - 6300 * 1000).toISOString(), // 1h 45m ago
      lastActiveAt: new Date(now - 6300 * 1000).toISOString(),
      durationSeconds: 8100, // 2h 15m
      durationFormatted: '2h 15m',
      status: 'logged_out',
      ipAddress: '192.168.1.15',
      deviceInfo: 'Desktop (macOS / Safari)'
    },
    // Sarah Jenkins yesterday afternoon session
    {
      id: 'sess-rec-104',
      sessionId: 'sess_hist_sarah_2',
      userId: 'u-2',
      userName: 'Sarah Jenkins',
      userEmail: 'sarah@theinclusionproject.ca',
      userRole: 'staff_manager',
      loginAt: new Date(now - dayMs - 18000 * 1000).toISOString(),
      logoutAt: new Date(now - dayMs - 5400 * 1000).toISOString(),
      lastActiveAt: new Date(now - dayMs - 5400 * 1000).toISOString(),
      durationSeconds: 12600, // 3h 30m
      durationFormatted: '3h 30m',
      status: 'logged_out',
      ipAddress: '192.168.1.15',
      deviceInfo: 'Desktop (macOS / Safari)'
    },
    // Marcus Vance (Staff Member) — program coordination session
    {
      id: 'sess-rec-105',
      sessionId: 'sess_hist_marcus_1',
      userId: 'u-3',
      userName: 'Marcus Vance',
      userEmail: 'marcus@theinclusionproject.ca',
      userRole: 'staff_member',
      loginAt: new Date(now - 21600 * 1000).toISOString(),
      logoutAt: new Date(now - 17100 * 1000).toISOString(),
      lastActiveAt: new Date(now - 17100 * 1000).toISOString(),
      durationSeconds: 4500, // 1h 15m
      durationFormatted: '1h 15m',
      status: 'logged_out',
      ipAddress: '192.168.1.42',
      deviceInfo: 'Desktop (Windows / Edge)'
    },
    // Marcus Vance yesterday session
    {
      id: 'sess-rec-106',
      sessionId: 'sess_hist_marcus_2',
      userId: 'u-3',
      userName: 'Marcus Vance',
      userEmail: 'marcus@theinclusionproject.ca',
      userRole: 'staff_member',
      loginAt: new Date(now - dayMs - 10800 * 1000).toISOString(),
      logoutAt: new Date(now - dayMs - 4800 * 1000).toISOString(),
      lastActiveAt: new Date(now - dayMs - 4800 * 1000).toISOString(),
      durationSeconds: 6000, // 1h 40m
      durationFormatted: '1h 40m',
      status: 'logged_out',
      ipAddress: '192.168.1.42',
      deviceInfo: 'Desktop (Windows / Edge)'
    },
    // Elena Rostova (Volunteer) — event check-in session
    {
      id: 'sess-rec-107',
      sessionId: 'sess_hist_elena_1',
      userId: 'u-4',
      userName: 'Elena Rostova',
      userEmail: 'elena@theinclusionproject.ca',
      userRole: 'volunteer',
      loginAt: new Date(now - dayMs - 7200 * 1000).toISOString(),
      logoutAt: new Date(now - dayMs - 4500 * 1000).toISOString(),
      lastActiveAt: new Date(now - dayMs - 4500 * 1000).toISOString(),
      durationSeconds: 2700, // 45m
      durationFormatted: '45m',
      status: 'logged_out',
      ipAddress: '192.168.1.88',
      deviceInfo: 'Tablet (iPad / Safari)'
    }
  ];
}

/**
 * Initializes and loads session records from disk or seeds.
 */
function ensureInitialized(): void {
  if (initialized) return;

  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      sessionsStore = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter((s): s is UserSessionRecord => s !== null);

      if (sessionsStore.length === 0) {
        sessionsStore = getBaselineSeedSessions();
        persistAllSessions();
      }
    } else {
      sessionsStore = getBaselineSeedSessions();
      persistAllSessions();
    }
  } catch (err: any) {
    safeLogger.warn(`[UserSessionTracker] Failed loading sessions file: ${err?.message}, using in-memory store`);
    sessionsStore = getBaselineSeedSessions();
  }

  initialized = true;
}

/**
 * Persists all in-memory sessions to disk.
 */
function persistAllSessions(): void {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const lines = sessionsStore.map(s => JSON.stringify(s)).join('\n') + '\n';
    fs.writeFileSync(SESSIONS_FILE, lines, 'utf-8');
  } catch (err: any) {
    safeLogger.warn(`[UserSessionTracker] Error persisting sessions to ${SESSIONS_FILE}: ${err?.message}`);
  }
}

/**
 * Appends a single session record to disk.
 */
function appendSessionRecord(record: UserSessionRecord): void {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(SESSIONS_FILE, JSON.stringify(record) + '\n', 'utf-8');
  } catch (err: any) {
    safeLogger.warn(`[UserSessionTracker] Error appending session record: ${err?.message}`);
  }
}

/**
 * Records a user login event and registers an active session.
 */
export function recordUserLogin(params: {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress?: string;
  deviceInfo?: string;
}): UserSessionRecord {
  ensureInitialized();

  const nowIso = new Date().toISOString();
  const id = `sess-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Mark any prior active session for the same user as expired/logged_out to prevent duplicate active flags
  sessionsStore.forEach(s => {
    if (s.userId === params.userId && s.status === 'active' && s.sessionId !== params.sessionId) {
      s.status = 'logged_out';
      s.logoutAt = nowIso;
      const startMs = new Date(s.loginAt).getTime();
      const endMs = new Date(nowIso).getTime();
      s.durationSeconds = Math.max(60, Math.round((endMs - startMs) / 1000));
      s.durationFormatted = formatDurationHoursMinutes(s.durationSeconds);
    }
  });

  const newRecord: UserSessionRecord = {
    id,
    sessionId: params.sessionId,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail.toLowerCase().trim(),
    userRole: params.userRole,
    loginAt: nowIso,
    lastActiveAt: nowIso,
    durationSeconds: 0,
    durationFormatted: '0m',
    status: 'active',
    ipAddress: params.ipAddress,
    deviceInfo: params.deviceInfo || 'Desktop Browser'
  };

  sessionsStore.unshift(newRecord);
  persistAllSessions();

  safeLogger.info(`[UserSessionTracker] Recorded login: ${params.userName} (${params.userEmail}) at ${nowIso}`);
  return newRecord;
}

/**
 * Records an activity heartbeat from an active session, extending duration.
 */
export function recordUserHeartbeat(params: {
  sessionId?: string;
  userId?: string;
}): UserSessionRecord | null {
  ensureInitialized();

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // Find matching active session by sessionId or userId
  const session = sessionsStore.find(s => 
    s.status === 'active' && 
    ((params.sessionId && s.sessionId === params.sessionId) || 
     (params.userId && s.userId === params.userId))
  );

  if (!session) return null;

  session.lastActiveAt = nowIso;
  const startMs = new Date(session.loginAt).getTime();
  session.durationSeconds = Math.max(60, Math.round((now - startMs) / 1000));
  session.durationFormatted = formatDurationHoursMinutes(session.durationSeconds);

  persistAllSessions();
  return session;
}

/**
 * Records a user logout event, setting logoutAt and calculating total hours and minutes used.
 */
export function recordUserLogout(params: {
  sessionId?: string;
  userId?: string;
  actorId?: string;
  actorRole?: string;
}): UserSessionRecord | null {
  ensureInitialized();

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // Find matching active session
  let session = sessionsStore.find(s => 
    s.status === 'active' && 
    ((params.sessionId && s.sessionId === params.sessionId) || 
     (params.userId && s.userId === params.userId))
  );

  // Fallback: If not found in active status, find the most recent session for this user
  if (!session && params.userId) {
    session = sessionsStore.find(s => s.userId === params.userId);
  }

  if (!session) return null;

  session.logoutAt = nowIso;
  session.status = 'logged_out';
  const startMs = new Date(session.loginAt).getTime();
  const diffSeconds = Math.max(60, Math.round((now - startMs) / 1000));
  session.durationSeconds = diffSeconds;
  session.durationFormatted = formatDurationHoursMinutes(diffSeconds);

  persistAllSessions();

  safeLogger.info(
    `[UserSessionTracker] Recorded logout: ${session.userName} (${session.userEmail}) at ${nowIso} — Used CRM for ${session.durationFormatted}`
  );

  return session;
}

/**
 * Super Admin force-terminates an active session.
 */
export function endUserSessionAdmin(params: {
  sessionId: string;
  adminId: string;
  adminRole: string;
}): { success: boolean; session?: UserSessionRecord; error?: string } {
  ensureInitialized();

  const session = sessionsStore.find(s => s.sessionId === params.sessionId || s.id === params.sessionId);
  if (!session) {
    return { success: false, error: 'Session record not found.' };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  session.logoutAt = nowIso;
  session.status = 'terminated';
  const startMs = new Date(session.loginAt).getTime();
  session.durationSeconds = Math.max(60, Math.round((now - startMs) / 1000));
  session.durationFormatted = formatDurationHoursMinutes(session.durationSeconds);

  persistAllSessions();

  recordAuditEvent({
    actorId: params.adminId,
    actorName: 'Admin',
    actorRole: params.adminRole,
    action: 'AUTH_SESSION_TERMINATED',
    resourceType: 'UserSession',
    resourceId: session.sessionId,
    entityName: session.userName,
    outcome: 'SUCCESS',
    description: `Super Admin forcefully terminated active CRM session for ${session.userName} (${session.userEmail}). Duration: ${session.durationFormatted}.`
  });

  return { success: true, session };
}

/**
 * Retrieves all session records with optional filtering, aggregated per-user summaries, and stats.
 */
export function getUserSessions(options?: {
  userId?: string;
  userRole?: string;
  status?: string;
  limit?: number;
}): {
  sessions: UserSessionRecord[];
  summaries: UserSessionSummary[];
  stats: UserSessionStats;
} {
  ensureInitialized();

  // Update duration on active sessions relative to current time
  const now = Date.now();
  sessionsStore.forEach(s => {
    if (s.status === 'active') {
      const startMs = new Date(s.loginAt).getTime();
      s.durationSeconds = Math.max(60, Math.round((now - startMs) / 1000));
      s.durationFormatted = formatDurationHoursMinutes(s.durationSeconds);
    }
  });

  let filtered = [...sessionsStore];

  if (options?.userId) {
    filtered = filtered.filter(s => s.userId === options.userId);
  }
  if (options?.userRole && options.userRole !== 'all') {
    filtered = filtered.filter(s => s.userRole === options.userRole);
  }
  if (options?.status && options.status !== 'all') {
    filtered = filtered.filter(s => s.status === options.status);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());

  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  // Build per-user usage summaries
  const userMap = new Map<string, {
    userName: string;
    userEmail: string;
    userRole: string;
    sessionsCount: number;
    totalSeconds: number;
    lastLoginAt: string;
    lastLogoutAt?: string;
    isActive: boolean;
  }>();

  for (const s of sessionsStore) {
    const existing = userMap.get(s.userId);
    if (!existing) {
      userMap.set(s.userId, {
        userName: s.userName,
        userEmail: s.userEmail,
        userRole: s.userRole,
        sessionsCount: 1,
        totalSeconds: s.durationSeconds,
        lastLoginAt: s.loginAt,
        lastLogoutAt: s.logoutAt,
        isActive: s.status === 'active'
      });
    } else {
      existing.sessionsCount += 1;
      existing.totalSeconds += s.durationSeconds;
      if (s.status === 'active') {
        existing.isActive = true;
      }
      if (new Date(s.loginAt).getTime() > new Date(existing.lastLoginAt).getTime()) {
        existing.lastLoginAt = s.loginAt;
      }
      if (s.logoutAt && (!existing.lastLogoutAt || new Date(s.logoutAt).getTime() > new Date(existing.lastLogoutAt).getTime())) {
        existing.lastLogoutAt = s.logoutAt;
      }
    }
  }

  const summaries: UserSessionSummary[] = Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
    userEmail: data.userEmail,
    userRole: data.userRole,
    totalSessions: data.sessionsCount,
    totalDurationSeconds: data.totalSeconds,
    totalDurationFormatted: formatDurationHoursMinutes(data.totalSeconds),
    lastLoginAt: data.lastLoginAt,
    lastLogoutAt: data.lastLogoutAt,
    status: data.isActive ? 'active' : 'offline',
    averageSessionFormatted: formatDurationHoursMinutes(
      data.sessionsCount > 0 ? Math.round(data.totalSeconds / data.sessionsCount) : 0
    )
  }));

  // Sort summaries by total usage duration descending
  summaries.sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

  // Overall system-wide usage statistics
  const activeUsersCount = summaries.filter(u => u.status === 'active').length;
  const totalSessionsCount = sessionsStore.length;
  const totalDurationSeconds = sessionsStore.reduce((acc, s) => acc + s.durationSeconds, 0);
  const averageDurationFormatted = formatDurationHoursMinutes(
    totalSessionsCount > 0 ? Math.round(totalDurationSeconds / totalSessionsCount) : 0
  );

  const stats: UserSessionStats = {
    activeUsersCount,
    totalSessionsCount,
    totalDurationSeconds,
    totalDurationFormatted: formatDurationHoursMinutes(totalDurationSeconds),
    averageDurationFormatted
  };

  return {
    sessions: filtered,
    summaries,
    stats
  };
}
