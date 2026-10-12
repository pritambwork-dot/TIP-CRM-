import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { ResourceType, ActionType, RoleId } from '../../types';
import { useCrm } from '../../context/CrmContext';

export interface ProtectedActionProps {
  /** The CRM resource being accessed or acted upon (e.g., 'people', 'programs', 'funding', 'tasks') */
  resource: ResourceType;
  /** The action attempted (e.g., 'create', 'delete', 'edit', 'export', 'import', 'assign', 'manage') */
  action: ActionType;
  /**
   * Behavior when the user lacks the required permission:
   * - 'disable': Keeps the UI element visible but disabled with visual cues (lock icon, dimmed styling, tooltip). (Default)
   * - 'hide': Completely removes the UI element from rendering (or displays fallback if provided).
   */
  mode?: 'disable' | 'hide';
  /** Optional minimum role required in hierarchy (e.g., 'super_admin', 'staff_manager') */
  minRole?: RoleId;
  /** Fallback content when mode='hide' and permission is denied. Defaults to null. */
  fallback?: React.ReactNode;
  /** Custom explanation message for the tooltip. If omitted, automatically derived from role definitions. */
  tooltip?: string;
  /** Synonym for tooltip */
  reason?: string;
  /** Whether to show a visual lock indicator on restricted items. Defaults to true. */
  showLockIcon?: boolean;
  /** Lock display style: 'badge' (small corner/inline lock tag), 'inline' (lock icon beside content), or 'overlay' (hover overlay) */
  lockStyle?: 'badge' | 'inline' | 'overlay';
  /** Additional CSS class for the wrapper container */
  className?: string;
  /** Component content (e.g., button, link, icon, menu item) */
  children: React.ReactNode;
}

/**
 * ProtectedAction
 * 
 * Component wrapper that guards interactive UI elements (e.g., 'Delete', 'Add', 'Export' buttons).
 * Automatically checks current user permissions for the specified resource and action.
 * If permission is lacking, it automatically hides or disables the element, applies
 * visual restricted feedback (lock icon, disabled cursor, grayscale, tooltip), and prevents interactions.
 * 
 * @example
 * <ProtectedAction resource="funding" action="create">
 *   <button onClick={openAddModal} className="btn-primary">Add funding</button>
 * </ProtectedAction>
 * 
 * @example
 * <ProtectedAction resource="people" action="delete" mode="disable" lockStyle="inline">
 *   <button onClick={handleDelete} className="btn-danger">Delete Contact</button>
 * </ProtectedAction>
 */
export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  resource,
  action,
  mode = 'disable',
  minRole,
  fallback = null,
  tooltip,
  reason,
  showLockIcon = true,
  lockStyle = 'badge',
  className = '',
  children
}) => {
  const { hasPermission, Permissions } = useCrm();

  // Evaluate permission and minimum role hierarchy
  const hasBasePermission = hasPermission(resource, action);
  const meetsMinRole = !minRole || Permissions.isAtLeast(minRole);
  const isPermitted = hasBasePermission && meetsMinRole;

  // If permitted, render children directly without wrapper intrusion
  if (isPermitted) {
    return <>{children}</>;
  }

  // If unpermitted and mode is 'hide', remove from DOM
  if (mode === 'hide') {
    return <>{fallback}</>;
  }

  // Unpermitted and mode is 'disable':
  // Compute user-friendly explanation
  const restrictionReason = reason || tooltip || Permissions.getDisabledReason(resource, action) || 'Action restricted for your current role.';

  // If child is a single valid React element (such as a <button>), clone it with disabled attributes
  let renderedChild: React.ReactNode = children;
  if (React.isValidElement(children)) {
    const childProps: any = children.props || {};
    renderedChild = React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      'aria-disabled': 'true',
      tabIndex: -1,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      className: `${childProps.className || ''} pointer-events-none cursor-not-allowed select-none opacity-60`,
      title: restrictionReason
    });
  }

  return (
    <div
      className={`relative inline-flex items-center group cursor-not-allowed select-none ${className}`}
      title={restrictionReason}
      aria-disabled="true"
      data-protected-action={`${resource}:${action}`}
    >
      {/* Wrapped child with pointer events captured and dimmed visual state */}
      <div className="pointer-events-none w-full flex items-center">
        {renderedChild}
      </div>

      {/* Visual Feedback for Restricted Items */}
      {showLockIcon && lockStyle === 'badge' && (
        <span 
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-zinc-800 text-white rounded-full shadow-xs ring-1 ring-white"
          title={restrictionReason}
        >
          <Lock className="w-2.5 h-2.5" />
        </span>
      )}

      {showLockIcon && lockStyle === 'inline' && (
        <span 
          aria-hidden="true"
          className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200"
        >
          <Lock className="w-3 h-3 text-zinc-500" />
          <span>Locked</span>
        </span>
      )}

      {showLockIcon && lockStyle === 'overlay' && (
        <div 
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-900/15 backdrop-blur-[0.5px] rounded-lg"
        >
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 text-white text-[11px] font-medium shadow-md">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>Restricted</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ProtectedAction;
