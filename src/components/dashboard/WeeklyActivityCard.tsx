import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Mail, 
  Phone, 
  Users, 
  Calendar, 
  X,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { InteractionItem, InteractionType } from '../../types';

interface WeeklyActivityCardProps {
  onNavigateToPeople?: () => void;
}

interface WeekDataPoint {
  weekKey: string;
  label: string;
  shortLabel: string;
  rangeLabel: string;
  startDateStr: string;
  endDateStr: string;
  total: number;
  meetings: number;
  emails: number;
  calls: number;
  workshops: number;
  notes: number;
  isCurrentWeek: boolean;
  items: InteractionItem[];
}

export const WeeklyActivityCard: React.FC<WeeklyActivityCardProps> = ({
  onNavigateToPeople
}) => {
  const { interactions, addInteraction, people, currentUser } = useCrm();
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekDataPoint | null>(null);

  // Form state for quick interaction log
  const [quickPersonId, setQuickPersonId] = useState(people[0]?.id || '');
  const [quickType, setQuickType] = useState<InteractionType>('Meeting');
  const [quickDate, setQuickDate] = useState('2026-09-18');
  const [quickSummary, setQuickSummary] = useState('');
  const [quickDetails, setQuickDetails] = useState('');

  // Fixed reference date matching TIP CRM demo timeline
  const todayStr = '2026-09-18';
  const todayDate = useMemo(() => new Date(todayStr + 'T12:00:00'), [todayStr]);

  // Generate the last 6 calendar-aligned weeks leading up to today
  // Each week is 7 days, ending on todayDate for week 0
  const weeklyData = useMemo<WeekDataPoint[]>(() => {
    const points: WeekDataPoint[] = [];

    for (let w = 5; w >= 0; w--) {
      const end = new Date(todayDate);
      end.setDate(end.getDate() - (w * 7));
      const start = new Date(end);
      start.setDate(start.getDate() - 6);

      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const sStr = fmt(start);
      const eStr = fmt(end);

      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      const startDay = start.getDate();
      const endDay = end.getDate();

      const rangeLabel = startMonth === endMonth 
        ? `${startMonth} ${startDay}–${endDay}`
        : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

      const shortLabel = w === 0 ? 'This Wk' : `${startMonth} ${startDay}`;
      const isCurrentWeek = w === 0;

      // Filter all interactions falling into this week's date bounds
      const weekInteractions = interactions.filter(int => int.date >= sStr && int.date <= eStr);

      const counts = {
        meetings: weekInteractions.filter(i => i.type === 'Meeting').length,
        emails: weekInteractions.filter(i => i.type === 'Email').length,
        calls: weekInteractions.filter(i => i.type === 'Call').length,
        workshops: weekInteractions.filter(i => i.type === 'Workshop').length,
        notes: weekInteractions.filter(i => i.type === 'Note' || i.type === 'Follow-up').length
      };

      points.push({
        weekKey: `w-${w}`,
        label: isCurrentWeek ? `Current Week (${rangeLabel})` : `Week of ${rangeLabel}`,
        shortLabel,
        rangeLabel,
        startDateStr: sStr,
        endDateStr: eStr,
        total: weekInteractions.length,
        meetings: counts.meetings,
        emails: counts.emails,
        calls: counts.calls,
        workshops: counts.workshops,
        notes: counts.notes,
        isCurrentWeek,
        items: weekInteractions
      });
    }

    return points;
  }, [todayDate, interactions]);

  // Key metrics
  const currentWeek = weeklyData[weeklyData.length - 1];
  const previousWeek = weeklyData[weeklyData.length - 2];
  
  const currentTotal = currentWeek ? currentWeek.total : 0;
  const previousTotal = previousWeek ? previousWeek.total : 0;

  const weeklyAverage = useMemo(() => {
    const sum = weeklyData.reduce((acc, w) => acc + w.total, 0);
    return (sum / (weeklyData.length || 1)).toFixed(1);
  }, [weeklyData]);

  const peakWeek = useMemo(() => {
    return Math.max(...weeklyData.map(w => w.total), 1);
  }, [weeklyData]);

  const momentumPercent = useMemo(() => {
    if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }, [currentTotal, previousTotal]);

  const totalAllWeeks = useMemo(() => {
    return weeklyData.reduce((sum, w) => sum + w.total, 0);
  }, [weeklyData]);

  // Active week to display details for
  const activeFocusWeek = selectedWeek || currentWeek;

  // Handle Quick Log
  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSummary.trim()) return;

    const person = people.find(p => p.id === quickPersonId);

    addInteraction({
      personId: quickPersonId || undefined,
      personName: person?.name || undefined,
      organizationId: person?.organizationId || undefined,
      organizationName: person?.organizationName || undefined,
      type: quickType,
      date: quickDate,
      summary: quickSummary.trim(),
      details: quickDetails.trim() || undefined,
      authorName: currentUser.name
    });

    setQuickSummary('');
    setQuickDetails('');
    setShowQuickLogModal(false);
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WeekDataPoint;
      return (
        <div className="bg-zinc-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs border border-zinc-800 pointer-events-none">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-semibold text-zinc-100">{data.rangeLabel}</span>
            {data.isCurrentWeek && (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                Current
              </span>
            )}
          </div>
          <div className="text-zinc-300 flex items-center gap-1 font-medium">
            <span className="text-base font-bold text-white">{data.total}</span>
            <span>{data.total === 1 ? 'interaction' : 'interactions logged'}</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-zinc-800 text-[11px] text-zinc-400 grid grid-cols-2 gap-x-2 gap-y-0.5">
            <span>Meetings: {data.meetings}</span>
            <span>Emails: {data.emails}</span>
            <span>Calls: {data.calls}</span>
            <span>Workshops: {data.workshops}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      id="weekly-activity-card"
      className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-2xs transition-all hover:border-zinc-300 relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-900 shrink-0">
            <Activity className="w-4 h-4 text-zinc-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                Weekly Activity
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Upward Trend (+{momentumPercent}%)
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Stakeholder & community touchpoints logged across cohorts
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onNavigateToPeople && (
            <button
              onClick={onNavigateToPeople}
              className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              View directory
            </button>
          )}

          <button
            onClick={() => setShowQuickLogModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Log an interaction now"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log touchpoint</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-3.5 mb-4 rounded-lg bg-zinc-50/80 border border-zinc-100 text-xs">
        <div>
          <span className="text-[11px] text-zinc-500 font-medium block">Current Week</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-zinc-900">{currentTotal}</span>
            <span className="text-[11px] text-zinc-500">logged</span>
          </div>
        </div>

        <div>
          <span className="text-[11px] text-zinc-500 font-medium block">WoW Momentum</span>
          <div className="flex items-center gap-1 mt-0.5">
            {momentumPercent >= 0 ? (
              <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{momentumPercent}%
              </span>
            ) : (
              <span className="text-zinc-600 font-bold inline-flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {momentumPercent}%
              </span>
            )}
            <span className="text-[10px] text-zinc-500 font-normal">vs prev wk</span>
          </div>
        </div>

        <div>
          <span className="text-[11px] text-zinc-500 font-medium block">Weekly Average</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-zinc-900">{weeklyAverage}</span>
            <span className="text-[11px] text-zinc-500">per week</span>
          </div>
        </div>

        <div>
          <span className="text-[11px] text-zinc-500 font-medium block">6-Week Volume</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-zinc-900">{totalAllWeeks}</span>
            <span className="text-[11px] text-zinc-500">interactions</span>
          </div>
        </div>
      </div>

      {/* Sparkline Chart Container rendered via Recharts */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-medium">
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Weekly Engagement Trajectory (Upward Trend • +{momentumPercent}% WoW)</span>
          </span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
            Peak: {peakWeek} interactions/wk
          </span>
        </div>

        {/* Recharts Area/Sparkline Chart */}
        <div className="w-full h-24 sm:h-28 relative select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={weeklyData} 
              margin={{ top: 8, right: 12, left: 12, bottom: 4 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload[0]) {
                  setSelectedWeek(state.activePayload[0].payload as WeekDataPoint);
                }
              }}
            >
              <defs>
                <linearGradient id="activitySparklineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <XAxis 
                dataKey="shortLabel" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 10, fill: '#71717a' }}
                interval={0}
              />

              <YAxis 
                hide 
                domain={[0, peakWeek + 1]} 
              />

              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#059669" 
                strokeWidth={2.4} 
                fillOpacity={1} 
                fill="url(#activitySparklineGradient)" 
                activeDot={{ 
                  r: 5.5, 
                  fill: '#047857', 
                  stroke: '#ffffff', 
                  strokeWidth: 2 
                }}
                dot={{ 
                  r: 3.5, 
                  fill: '#059669', 
                  stroke: '#ffffff', 
                  strokeWidth: 1.5 
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected / Current Week Engagement Breakdown */}
      <div className="mt-3.5 pt-3 border-t border-zinc-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900">
              {activeFocusWeek.rangeLabel}
            </span>
            {activeFocusWeek.isCurrentWeek && (
              <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                This week
              </span>
            )}
            <span className="text-xs text-zinc-500 font-medium">
              • {activeFocusWeek.total} total logged
            </span>
          </div>

          {/* Breakdown Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            {activeFocusWeek.meetings > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium">
                <Users className="w-3 h-3 text-zinc-500" />
                <span>{activeFocusWeek.meetings} Meetings</span>
              </span>
            )}
            {activeFocusWeek.emails > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium">
                <Mail className="w-3 h-3 text-zinc-500" />
                <span>{activeFocusWeek.emails} Emails</span>
              </span>
            )}
            {activeFocusWeek.calls > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium">
                <Phone className="w-3 h-3 text-zinc-500" />
                <span>{activeFocusWeek.calls} Calls</span>
              </span>
            )}
            {activeFocusWeek.workshops > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>{activeFocusWeek.workshops} Workshops</span>
              </span>
            )}
          </div>
        </div>

        {/* Display recent touchpoint preview from this week */}
        {activeFocusWeek.items.length > 0 && (
          <div className="mt-2 text-xs text-zinc-600 flex items-center justify-between gap-2 bg-zinc-50/60 p-2 rounded-lg border border-zinc-100">
            <p className="truncate">
              <span className="font-semibold text-zinc-900">Latest:</span>{' '}
              <span className="text-zinc-800 font-medium">{activeFocusWeek.items[0].personName || 'Partner'}</span> —{' '}
              {activeFocusWeek.items[0].summary}
            </p>
            <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
              {activeFocusWeek.items[0].date}
            </span>
          </div>
        )}
      </div>

      {/* Quick Record Modal */}
      {showQuickLogModal && (
        <div 
          className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowQuickLogModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-900">Record Community Touchpoint</h3>
              </div>
              <button 
                onClick={() => setShowQuickLogModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickLog} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Contact / Stakeholder *</label>
                <select
                  value={quickPersonId}
                  onChange={e => setQuickPersonId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 bg-white focus:ring-1 focus:ring-zinc-900"
                  required
                >
                  {people.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.organizationName ? `(${p.organizationName})` : ''} — {p.role || p.relationshipTypes.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Channel / Type</label>
                  <select
                    value={quickType}
                    onChange={e => setQuickType(e.target.value as InteractionType)}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 bg-white"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Call">Phone Call</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Note">Internal Note</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={quickDate}
                    onChange={e => setQuickDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discussed workshop transportation subsidies and venue access"
                  value={quickSummary}
                  onChange={e => setQuickSummary(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Key Takeaways & Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Key decisions, commitments, next steps..."
                  value={quickDetails}
                  onChange={e => setQuickDetails(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowQuickLogModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save & Update Sparkline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
