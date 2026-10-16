import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { 
  Sparkles, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  User, 
  Clock, 
  Filter, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCw, 
  Zap, 
  ShieldCheck, 
  ShieldAlert,
  Lock,
  Info, 
  Inbox, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { 
  AiSuggestion, 
  AiSuggestionCategory, 
  AiSuggestionSeverity, 
  AiSuggestionStatus 
} from '../../types';
import { ActionPreviewModal } from './ActionPreviewModal';
import { Permissions } from '../../lib/permissions';

export const SuggestionsCenterView: React.FC = () => {
  const { 
    aiSuggestions, 
    currentUser, 
    updateSuggestionStatus, 
    recordSuggestionFeedback, 
    refreshAiSuggestions,
    pendingActionPreview,
    setPendingActionPreview,
    hasPermission
  } = useCrm();

  const [activeCategory, setActiveCategory] = useState<AiSuggestionCategory | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<AiSuggestionSeverity | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'completed' | 'dismissed'>('active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canView = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'view');
  const canCreate = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'create');
  const canManage = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'manage');
  const isManagerOrAdmin = canManage;

  if (!canView) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">Restricted Access: AI Suggestions</h3>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          {Permissions.getDisabledReason(currentUser, 'intelligence', 'view')}
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-medium text-zinc-600">
          <span>Active Role:</span>
          <strong className="text-zinc-900">{currentUser.roleId || 'User'}</strong>
        </div>
      </div>
    );
  }

  // Filter suggestions
  const filteredSuggestions = aiSuggestions.filter(s => {
    // Role scope
    if (!canManage && s.category === 'Organization' && s.userId && s.userId !== currentUser.id) {
      return false;
    }

    // Category
    if (activeCategory !== 'All' && s.category !== activeCategory) return false;

    // Severity
    if (severityFilter !== 'All' && s.severity !== severityFilter) return false;

    // Status
    if (statusFilter === 'active') {
      return s.status === 'new' || s.status === 'seen';
    }
    if (statusFilter === 'completed') {
      return s.status === 'completed' || s.status === 'accepted';
    }
    if (statusFilter === 'dismissed') {
      return s.status === 'dismissed';
    }

    return true;
  });

  const categories: Array<{ id: AiSuggestionCategory | 'All'; label: string; count: number }> = [
    { id: 'All', label: 'All Suggestions', count: aiSuggestions.filter(s => s.status === 'new' || s.status === 'seen').length },
    { id: 'For You', label: 'For You', count: aiSuggestions.filter(s => s.category === 'For You' && (s.status === 'new' || s.status === 'seen')).length },
    { id: 'Organization', label: 'Organization', count: aiSuggestions.filter(s => s.category === 'Organization' && (s.status === 'new' || s.status === 'seen')).length },
    { id: 'Workflow', label: 'Workflow & Rules', count: aiSuggestions.filter(s => s.category === 'Workflow' && (s.status === 'new' || s.status === 'seen')).length },
    { id: 'Data', label: 'Data Quality', count: aiSuggestions.filter(s => s.category === 'Data' && (s.status === 'new' || s.status === 'seen')).length }
  ];

  const criticalCount = aiSuggestions.filter(s => s.severity === 'Critical' && (s.status === 'new' || s.status === 'seen')).length;
  const completedCount = aiSuggestions.filter(s => s.status === 'completed' || s.status === 'accepted').length;

  const handleFeedback = (id: string, feedback: 'useful' | 'not_useful') => {
    recordSuggestionFeedback(id, feedback);
    setToastMessage(`Feedback recorded: "${feedback === 'useful' ? 'Helpful pattern' : 'Marked not useful'}"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getSeverityBadgeClass = (severity: AiSuggestionSeverity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Important':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Suggested':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-[#140a8e]/10 text-[#140a8e]">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#140a8e]">Continuous Work Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Suggestions Center</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Observable CRM patterns, proactive operational insights, and safe action proposals grounded in verified system data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={!canCreate}
            onClick={() => canCreate && refreshAiSuggestions()}
            title={!canCreate ? Permissions.getDisabledReason(currentUser, 'intelligence', 'create') : 'Scan CRM for actionable patterns'}
            className={`px-3.5 py-2 border rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors ${
              canCreate
                ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700 cursor-pointer'
                : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60'
            }`}
          >
            {canCreate ? <RotateCw className="w-3.5 h-3.5 text-zinc-500" /> : <Lock className="w-3.5 h-3.5 text-zinc-400" />}
            <span>Scan CRM Patterns</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-medium text-zinc-500 mb-1">Active Suggestions</div>
          <div className="text-2xl font-bold text-zinc-900">
            {aiSuggestions.filter(s => s.status === 'new' || s.status === 'seen').length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Across 4 operational categories</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-medium text-zinc-500 mb-1">Critical Actions Pending</div>
          <div className="text-2xl font-bold text-rose-600">
            {criticalCount}
          </div>
          <div className="text-[11px] text-rose-500 mt-1">Require prompt staff resolution</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-medium text-zinc-500 mb-1">Actions Executed</div>
          <div className="text-2xl font-bold text-emerald-600">
            {completedCount}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Confirmed with human-in-the-loop</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-medium text-zinc-500 mb-1">Grounding Architecture</div>
          <div className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5 mt-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Zero Profiling Invariant</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Observable work facts only</div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === cat.id 
                  ? 'bg-[#140a8e] text-white shadow-xs' 
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Severity & Status Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Severity:</span>
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#140a8e]"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="Important">Important</option>
            <option value="Suggested">Suggested</option>
            <option value="Informational">Informational</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#140a8e]"
          >
            <option value="active">Active Only</option>
            <option value="completed">Completed / Accepted</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All Records</option>
          </select>
        </div>
      </div>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 space-y-3">
          <Inbox className="w-10 h-10 mx-auto text-zinc-300" />
          <h3 className="text-sm font-semibold text-zinc-800">No suggestions in this view</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            All observable CRM patterns in this category are up to date, completed, or filtered out.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map(sug => {
            const isResolved = sug.status === 'completed' || sug.status === 'dismissed' || sug.status === 'accepted';

            return (
              <div 
                key={sug.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                  sug.severity === 'Critical' 
                    ? 'border-rose-200 hover:border-rose-300' 
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-zinc-100 text-zinc-700">
                      {sug.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSeverityBadgeClass(sug.severity)}`}>
                      {sug.severity}
                    </span>
                    {sug.targetPostName && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Post: {sug.targetPostName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">
                      {new Date(sug.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </span>
                    {!isResolved && canManage && (
                      <button
                        onClick={() => updateSuggestionStatus(sug.id, 'dismissed')}
                        title="Dismiss suggestion"
                        className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-zinc-900 mb-1">{sug.title}</h3>
                <p className="text-xs text-zinc-500 mb-4">{sug.description}</p>

                {/* 3-Part Grounded Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/70 text-xs mb-4">
                  {/* 1. OBSERVED */}
                  <div className="space-y-1 border-b md:border-b-0 md:border-r border-zinc-200/70 pb-3 md:pb-0 md:pr-3">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold uppercase tracking-wider text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      1. Observed Fact
                    </div>
                    <p className="text-zinc-800 leading-relaxed">{sug.observed}</p>
                  </div>

                  {/* 2. INTERPRETATION */}
                  <div className="space-y-1 border-b md:border-b-0 md:border-r border-zinc-200/70 pb-3 md:pb-0 md:px-3">
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold uppercase tracking-wider text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      2. Interpretation
                    </div>
                    <p className="text-zinc-700 leading-relaxed">{sug.interpretation}</p>
                  </div>

                  {/* 3. SUGGESTION */}
                  <div className="space-y-1 md:pl-3">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      3. Actionable Suggestion
                    </div>
                    <p className="text-zinc-800 leading-relaxed font-medium">{sug.suggestion}</p>
                  </div>
                </div>

                {/* Supporting Data Badges */}
                {sug.supportingData && Object.keys(sug.supportingData).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Metrics:</span>
                    {Object.entries(sug.supportingData).map(([key, val]) => (
                      <span key={key} className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-700">
                        {key}: <strong className="text-zinc-900">{String(val)}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    {/* User Feedback */}
                    <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
                      <button
                        onClick={() => handleFeedback(sug.id, 'useful')}
                        className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
                          sug.userFeedback === 'useful' 
                            ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        title="Mark pattern as useful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Useful</span>
                      </button>
                      <button
                        onClick={() => handleFeedback(sug.id, 'not_useful')}
                        className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
                          sug.userFeedback === 'not_useful' 
                            ? 'bg-rose-50 text-rose-700 font-semibold' 
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        title="Mark pattern as not useful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Not Useful</span>
                      </button>
                    </div>

                    {isResolved && (
                      <span className="text-xs text-zinc-400 font-medium px-2 py-1 bg-zinc-50 rounded-lg">
                        Status: <strong className="text-zinc-700 uppercase text-[10px]">{sug.status}</strong>
                      </span>
                    )}
                  </div>

                  {/* Action Preview Button */}
                  {sug.actionPreview && !isResolved && (
                    <button
                      disabled={!canManage}
                      onClick={() => canManage && setPendingActionPreview(sug.actionPreview || null)}
                      title={!canManage ? Permissions.getDisabledReason(currentUser, 'intelligence', 'manage') : undefined}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                        canManage
                          ? 'bg-[#140a8e] hover:bg-[#0f076e] text-white cursor-pointer'
                          : 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed opacity-75'
                      }`}
                    >
                      {canManage ? <Zap className="w-3.5 h-3.5 text-amber-300" /> : <Lock className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>{sug.actionPreview.title}</span>
                      {canManage && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Preview Modal */}
      <ActionPreviewModal 
        preview={pendingActionPreview}
        onClose={() => setPendingActionPreview(null)}
        onSuccess={(msg) => setToastMessage(msg)}
      />
    </div>
  );
};
