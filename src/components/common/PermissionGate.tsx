import React from 'react';
import { ResourceType, ActionType, RoleId } from '../../types';
import { useCrm } from '../../context/CrmContext';
import { Lock } from 'lucide-react';

interface PermissionGateProps {
  resource: ResourceType;
  action: ActionType;
  minRole?: RoleId;
  mode?: 'hide' | 'disable';
  fallback?: React.ReactNode;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}

/**
  * PermissionGate
  * Conditionally renders or disables UI components based on the user's role and permission matrix.
  */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  resource,
  action,
  minRole,
  mode = 'hide',
  fallback = null,
  tooltip,
  className = '',
  children
}) => {
  const { hasPermission, Permissions } = useCrm();

  const isPermitted = hasPermission(resource, action) && (!minRole || Permissions.isAtLeast(minRole));

  if (isPermitted) {
    return <>{children}</>;
  }

  if (mode === 'hide') {
    return <>{fallback}</>;
  }

  // mode === 'disable': render children in disabled visual state with accessible tooltip
  const disabledReason = tooltip || Permissions.getDisabledReason(resource, action);

  return (
    <div 
      className={`relative group inline-flex items-center cursor-not-allowed select-none ${className}`}
      title={disabledReason}
      aria-disabled="true"
    >
      <div className="opacity-40 pointer-events-none grayscale-30 w-full flex items-center">
        {children}
      </div>

      {/* Subtle overlay lock indicator on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-900/10 rounded-lg">
        <span className="p-1 rounded-full bg-zinc-900 text-white shadow-md">
          <Lock className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};

export { ProtectedAction } from './ProtectedAction';
