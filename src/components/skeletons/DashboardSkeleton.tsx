import React from 'react';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="glass-panel rounded-2xl p-6 text-foreground">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">Loading dashboard…</h2>
            <p className="text-sm text-muted-foreground">Fetching your personalized analytics</p>
          </div>
          <div className="space-y-2">
            <div className="h-8 w-48 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-64 bg-white/6 dark:bg-white/6 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <div className="h-32 bg-white/6 dark:bg-white/6 rounded animate-pulse" />
            <div className="h-32 bg-white/6 dark:bg-white/6 rounded animate-pulse" />
            <div className="h-32 bg-white/6 dark:bg-white/6 rounded animate-pulse" />
            <div className="h-32 bg-white/6 dark:bg-white/6 rounded animate-pulse" />
          </div>

          <div className="mt-6">
            <div className="h-64 bg-white/6 dark:bg-white/6 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
