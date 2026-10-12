import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  User, 
  Tag, 
  Zap, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { AiActionPreview } from '../../types';

interface ActionPreviewModalProps {
  preview: AiActionPreview | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const ActionPreviewModal: React.FC<ActionPreviewModalProps> = ({ preview, onClose, onSuccess }) => {
  const { executeAiAction } = useCrm();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!preview) return null;

  const handleConfirm = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const res = await executeAiAction(preview);
      if (res.success) {
        onSuccess?.(res.message);
        onClose();
      } else {
        setError('Failed to execute action. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error executing action');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderPayloadDetails = () => {
    const p = preview.payload || {};

    switch (preview.actionType) {
      case 'create_tasks': {
        const tasks = p.tasks || [];
        if (p.taskId && p.newDueDate) {
          return (
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-2">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Deadline Alignment</div>
              <div className="text-sm font-medium text-zinc-900">{preview.targetRecordName || 'Selected Task'}</div>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>New Target Due Date: <strong className="text-zinc-900">{p.newDueDate}</strong></span>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Tasks to be Created ({tasks.length})
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {tasks.map((t: any, idx: number) => (
                <div key={idx} className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 text-left">
                  <div className="text-sm font-medium text-zinc-900 mb-1">{t.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-zinc-400" />
                      {t.assignedToName || 'Current User'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      Due {t.dueDate || '2026-09-24'}
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      {t.priority || 'High'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'assign_task': {
        const taskIds = p.taskIds || [];
        return (
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-2 text-left">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Task Assignment</div>
            <div className="text-sm text-zinc-900">
              Reassigning <span className="font-semibold text-zinc-900">{taskIds.length} open task(s)</span> to:
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-900 shadow-sm">
              <User className="w-4 h-4 text-[#140a8e]" />
              {p.assigneeName || 'Designated Staff'}
            </div>
          </div>
        );
      }

      case 'create_rule': {
        return (
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-2.5 text-left">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Automation Rule Configuration</div>
            <div className="text-sm font-semibold text-zinc-900">{p.name}</div>
            <div className="text-xs text-zinc-600">{p.description}</div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/80 text-xs">
              <div>
                <span className="text-zinc-500">Trigger Event:</span>
                <p className="font-medium text-zinc-800">{p.triggerType}</p>
              </div>
              <div>
                <span className="text-zinc-500">Target Post:</span>
                <p className="font-medium text-zinc-800">{p.assignedPostId || 'Program Coordinator'}</p>
              </div>
            </div>
          </div>
        );
      }

      case 'log_interaction': {
        return (
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-2 text-left">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Touchpoint Entry</div>
            <div className="text-sm font-medium text-zinc-900">{p.summary || preview.title}</div>
            <div className="text-xs text-zinc-600">{p.details || preview.description}</div>
          </div>
        );
      }

      default:
        return (
          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 text-xs text-zinc-600 font-mono text-left overflow-x-auto">
            {JSON.stringify(p, null, 2)}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#140a8e]/10 text-[#140a8e] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-[#140a8e]">TIP Intelligence Action</div>
              <h3 className="text-base font-bold text-zinc-900">{preview.title}</h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {preview.description && (
            <p className="text-sm text-zinc-600 text-left leading-relaxed">
              {preview.description}
            </p>
          )}

          {/* Target Record Badge */}
          {preview.targetRecordType && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200/80">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <span>Target: <strong className="text-zinc-800">{preview.targetRecordType}</strong></span>
              {preview.targetRecordName && (
                <>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span className="font-medium text-zinc-800 truncate">{preview.targetRecordName}</span>
                </>
              )}
            </div>
          )}

          {/* Action Details */}
          {renderPayloadDetails()}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Guardrail Guarantee */}
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 flex items-start gap-2.5 text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed">
              <strong>Human-In-The-Loop Confirmation:</strong> Mutations execute only upon your explicit approval. An audit record will be logged in the system log.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#140a8e] hover:bg-[#0f076e] rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Apply Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
