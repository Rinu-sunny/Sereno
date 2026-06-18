import React from 'react';

const TimerSkeleton: React.FC = () => (
  <div className="min-h-screen pt-24 pb-12 px-4">
    <div className="max-w-6xl mx-auto glass-panel rounded-2xl p-6">
      <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
        <div className="w-full lg:w-auto flex flex-col items-center gap-8">
          <div className="h-12 w-64 bg-white/8 rounded animate-pulse" />
          <div className="h-64 w-64 bg-white/6 rounded-full animate-pulse" />
          <div className="flex gap-4">
            <div className="h-12 w-24 bg-white/6 rounded animate-pulse" />
            <div className="h-12 w-24 bg-white/6 rounded animate-pulse" />
            <div className="h-12 w-24 bg-white/6 rounded animate-pulse" />
          </div>
        </div>

        <div className="w-full lg:w-1/3">
          <div className="h-96 bg-white/6 rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

export default TimerSkeleton;
