import React from 'react';

const SettingsSkeleton: React.FC = () => (
  <div className="min-h-screen pt-24 pb-12 px-4">
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="glass-panel rounded-2xl p-6">
        <div className="space-y-2">
          <div className="h-8 w-1/3 bg-white/8 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-white/6 rounded animate-pulse" />
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="h-8 w-1/4 bg-white/8 rounded animate-pulse" />
        <div className="h-48 bg-white/6 rounded animate-pulse" />
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="h-8 w-1/4 bg-white/8 rounded animate-pulse" />
        <div className="h-48 bg-white/6 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

export default SettingsSkeleton;
