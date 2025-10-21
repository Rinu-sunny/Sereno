import React from 'react';

const HomeSkeleton: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
    <div className="max-w-4xl mx-auto text-center space-y-12 py-20 glass-panel rounded-2xl p-8">
      <div className="space-y-6">
        <div className="h-12 w-1/2 bg-white/8 rounded mx-auto animate-pulse" />
        <div className="h-6 w-3/4 bg-white/6 rounded mx-auto animate-pulse" />
        <div className="h-12 w-48 bg-white/8 rounded mx-auto animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12">
        <div className="h-40 bg-white/6 rounded animate-pulse" />
        <div className="h-40 bg-white/6 rounded animate-pulse" />
        <div className="h-40 bg-white/6 rounded animate-pulse" />
        <div className="h-40 bg-white/6 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

export default HomeSkeleton;
