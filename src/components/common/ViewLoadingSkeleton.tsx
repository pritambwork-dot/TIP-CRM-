import React from 'react';

export const ViewLoadingSkeleton: React.FC<{ title?: string }> = ({ title = 'Loading content' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${title}...`}
      className="w-full space-y-4 sm:space-y-6 animate-pulse p-1"
    >
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/80 rounded-md" />
          <div className="h-4 w-72 bg-muted/50 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-muted/60 rounded-lg" />
          <div className="h-9 w-28 bg-muted/70 rounded-lg" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-card border border-border/40 rounded-xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-muted/60 rounded" />
              <div className="h-6 w-6 rounded-lg bg-muted/40" />
            </div>
            <div className="h-6 w-16 bg-muted/80 rounded" />
          </div>
        ))}
      </div>

      {/* Table / List Skeleton */}
      <div className="bg-card border border-border/40 rounded-xl p-4 sm:p-6 shadow-xs space-y-3">
        <div className="h-5 w-36 bg-muted/70 rounded" />
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted/30 rounded-lg flex items-center px-4 justify-between">
              <div className="h-4 w-1/3 bg-muted/50 rounded" />
              <div className="h-4 w-1/4 bg-muted/40 rounded" />
              <div className="h-4 w-16 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
