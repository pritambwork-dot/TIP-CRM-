import React, { useState, useEffect, useRef } from 'react';
import { useCrm } from '../../context/CrmContext';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ChevronRight, 
  RotateCw, 
  ShieldCheck, 
  Zap, 
  ThumbsUp, 
  ThumbsDown, 
  Compass,
  Layers,
  Calendar,
  ListTodo,
  Database
} from 'lucide-react';
import { AiMessage, AiSuggestion } from '../../types';
import { ActionPreviewModal } from './ActionPreviewModal';

interface TipIntelligenceDrawerProps {
  currentView?: string;
  contextRecord?: { type: string; id: string; name: string };
  onNavigate?: (view: string, id?: string) => void;
}

export const TipIntelligenceDrawer: React.FC<TipIntelligenceDrawerProps> = ({ 
  currentView = 'dashboard',
  contextRecord,
  onNavigate
}) => {
  const { 
    isAiDrawerOpen, 
    setIsAiDrawerOpen, 
    currentUser, 
    aiSuggestions, 
    aiMessages, 
    sendIntelligenceMessage,
    updateSuggestionStatus,
    recordSuggestionFeedback,
    refreshAiSuggestions,
    pendingActionPreview,
    setPendingActionPreview,
    aiBudgetConfig
  } = useCrm();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isManagerOrAdmin = 
    currentUser.roleId === 'super_admin' || 
    currentUser.roleId === 'staff_manager';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAiDrawerOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiDrawerOpen]);

  // Clear toast after 4s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  if (!isAiDrawerOpen) return null;

  // Filter relevant suggestions for the user
  const relevantSuggestions = aiSuggestions.filter(s => {
    if (s.status === 'dismissed' || s.status === 'completed') return false;
    if (isManagerOrAdmin) return true;
    return s.userId === currentUser.id || s.category === 'For You' || !s.userId;
  });

  const criticalOrImportant = relevantSuggestions.filter(s => s.severity === 'Critical' || s.severity === 'Important');
  const topSuggestion = criticalOrImportant[0] || relevantSuggestions[0];

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputPrompt;
    if (!textToSend.trim() || isSending) return;

    setInputPrompt('');
    setIsSending(true);

    try {
      await sendIntelligenceMessage(textToSend, undefined, {
        contextType: currentView,
        contextRecordId: contextRecord?.id,
        contextRecordName: contextRecord?.name
      });
    } catch (err) {
      console.error('Failed to send intelligence message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleChipClick = (action: string, payload?: any) => {
    if (action === 'preview_action' && payload?.actionPreviewId) {
      const foundSug = aiSuggestions.find(s => s.actionPreview?.id === payload.actionPreviewId);
      if (foundSug?.actionPreview) {
        setPendingActionPreview(foundSug.actionPreview);
      }
    } else if (action === 'navigate' && payload?.view) {
      onNavigate?.(payload.view, payload.eventId || payload.programId || payload.taskId);
    } else if (action === 'query' && payload?.query) {
      handleSend(payload.query);
    } else if (action === 'filter_tasks') {
      onNavigate?.('tasks');
    }
  };

  // Format 3-part markdown structure neatly
  const renderMessageContent = (content: string) => {
    const parts = content.split(/\*\*(OBSERVED|INTERPRETATION|SUGGESTION)\*\*/g);

    if (parts.length <= 1) {
      return <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{content}</div>;
    }

    const sections: Array<{ title: string; body: string }> = [];
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i];
      const body = parts[i + 1] || '';
      sections.push({ title, body: body.trim() });
    }

    return (
      <div className="space-y-3 text-left">
        {sections.map((sec, idx) => {
          let badgeColor = 'text-blue-700 bg-blue-50 border-blue-200';
          if (sec.title === 'INTERPRETATION') badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
          if (sec.title === 'SUGGESTION') badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

          return (
            <div key={idx} className="space-y-1">
              <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                {sec.title}
              </span>
              <div className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed pl-1">
                {sec.body}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={() => setIsAiDrawerOpen(false)}
      />

      {/* Drawer Container */}
      <aside 
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-zinc-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-slideLeft"
        aria-label="TIP Intelligence Drawer"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#140a8e] to-[#2a1fb4] text-white flex items-center justify-center shadow-md shadow-[#140a8e]/10">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">TIP Intelligence</h2>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {isManagerOrAdmin ? 'Admin / Manager Mode' : 'Employee Mode'} • {currentUser.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => refreshAiSuggestions()}
              title="Refresh observable patterns"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAiDrawerOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Context Banner if on a specific record */}
          {contextRecord && (
            <div className="p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900 text-left">
              <div className="flex items-center gap-2 truncate">
                <Compass className="w-3.5 h-3.5 text-[#140a8e] shrink-0" />
                <span className="truncate">
                  Context: <strong className="font-semibold">{contextRecord.name}</strong> ({contextRecord.type})
                </span>
              </div>
              <span className="text-[10px] text-blue-700 font-mono px-1.5 py-0.5 rounded bg-blue-100 shrink-0">
                Focused
              </span>
            </div>
          )}

          {/* "The One Thing" Priority Banner */}
          {topSuggestion && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-zinc-50 border border-indigo-100 shadow-sm text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#140a8e]/5 rounded-bl-full pointer-events-none" />
              
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#140a8e] text-white">
                  <Zap className="w-3 h-3" />
                  The One Thing Right Now
                </span>
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {topSuggestion.severity}
                </span>
              </div>

              <h4 className="text-xs font-bold text-zinc-900 mb-1">{topSuggestion.title}</h4>
              <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{topSuggestion.observed}</p>

              {topSuggestion.actionPreview && (
                <button
                  onClick={() => setPendingActionPreview(topSuggestion.actionPreview || null)}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-50 border border-indigo-200 text-[#140a8e] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer"
                >
                  <span>Review & Apply Action</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Conversation Stream */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-1">
              <span>Work Intelligence Thread</span>
              <span>Grounding: Grounded AI</span>
            </div>

            {aiMessages.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 space-y-2">
                <Bot className="w-8 h-8 mx-auto text-zinc-300" />
                <p className="text-xs">Ask anything about your tasks, events, participants, or team priorities.</p>
              </div>
            ) : (
              aiMessages.map(msg => {
                const isAi = msg.role === 'assistant';

                return (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'} text-left`}
                  >
                    {isAi && (
                      <div className="w-7 h-7 rounded-lg bg-[#140a8e] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-[88%] space-y-2.5 ${isAi ? 'bg-zinc-50/80 border border-zinc-200 p-3.5 rounded-2xl rounded-tl-sm' : 'bg-[#140a8e] text-white p-3 rounded-2xl rounded-tr-sm'}`}>
                      {isAi && (
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          {msg.tier === 'DETERMINISTIC' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                              <Zap className="w-2.5 h-2.5 text-emerald-600" />
                              ⚡ Instant Query (0 Tokens)
                            </span>
                          ) : msg.cached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100/80 text-blue-800 border border-blue-300">
                              <Database className="w-2.5 h-2.5 text-blue-600" />
                              💾 Cached Result (0 Tokens)
                            </span>
                          ) : msg.budgetExceeded ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100/80 text-amber-800 border border-amber-300">
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                              ⚠️ Budget Limit Reached (Fallback)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100/80 text-purple-800 border border-purple-300">
                              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                              ✨ TIP Intelligence
                            </span>
                          )}
                        </div>
                      )}

                      {isAi ? renderMessageContent(msg.content) : (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {/* Action Preview Card inside AI message */}
                      {msg.actionPreview && (
                        <div className="mt-3 p-3 bg-white border border-zinc-200 rounded-xl shadow-xs space-y-2 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#140a8e] flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Proposed Safe Action
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">Requires Confirmation</span>
                          </div>
                          <div className="text-xs font-semibold text-zinc-900">{msg.actionPreview.title}</div>
                          <p className="text-[11px] text-zinc-500">{msg.actionPreview.description}</p>
                          <button
                            onClick={() => setPendingActionPreview(msg.actionPreview || null)}
                            className="w-full mt-1 py-1.5 px-3 bg-[#140a8e] hover:bg-[#0f076e] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Preview & Confirm Action</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Quick Action Chips */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestedActions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => handleChipClick(action.action, action.payload)}
                              className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[11px] font-medium text-zinc-700 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>{action.label}</span>
                              <ChevronRight className="w-3 h-3 text-zinc-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isAi && (
                      <div className="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex gap-3 justify-start items-center text-left text-zinc-500 text-xs py-2 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-[#140a8e]/10 text-[#140a8e] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <span>Synthesizing grounded CRM patterns...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Quick Question Starters */}
        <div className="px-5 py-2 border-t border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <button
            onClick={() => handleSend("What are my top priorities for today?")}
            className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full text-zinc-700 text-[11px] whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            📋 Today's Priorities
          </button>
          <button
            onClick={() => handleSend("What needs to be prepared for Saturday's workshop?")}
            className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full text-zinc-700 text-[11px] whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            🏛️ Workshop Readiness
          </button>
          {isManagerOrAdmin && (
            <button
              onClick={() => handleSend("Show unassigned tasks and team workload distribution")}
              className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full text-zinc-700 text-[11px] whitespace-nowrap transition-colors shrink-0 cursor-pointer"
            >
              👥 Team Workload
            </button>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/60">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={isManagerOrAdmin ? "Ask about team workload, unassigned tasks..." : "Ask what to prioritize, event prep, tasks..."}
              className="flex-1 bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#140a8e]/20 focus:border-[#140a8e] transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isSending}
              className="p-2.5 bg-[#140a8e] hover:bg-[#0f076e] disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-zinc-400" />
              RBAC & Data Scoped
            </span>
            <span>Closed-loop action verification</span>
          </div>
        </div>
      </aside>

      {/* Action Preview Modal */}
      <ActionPreviewModal 
        preview={pendingActionPreview}
        onClose={() => setPendingActionPreview(null)}
        onSuccess={(msg) => setSuccessToast(msg)}
      />
    </>
  );
};
