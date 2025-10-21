import React from 'react';

const PageSkeleton: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-surface/30 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-surface/30 rounded" />
            <div className="h-32 bg-surface/30 rounded" />
            <div className="h-32 bg-surface/30 rounded" />
            <div className="h-32 bg-surface/30 rounded" />
          </div>
          <div className="h-64 bg-surface/30 rounded" />
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
