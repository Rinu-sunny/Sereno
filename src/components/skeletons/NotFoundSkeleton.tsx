import React from 'react';

const NotFoundSkeleton: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="text-center space-y-6 max-w-md glass-panel rounded-2xl p-8">
      <div className="h-24 w-24 bg-white/6 rounded-full mx-auto animate-pulse" />
      <div className="h-12 w-24 bg-white/8 rounded mx-auto animate-pulse" />
      <div className="h-6 w-64 bg-white/6 rounded mx-auto animate-pulse" />
    </div>
  </div>
);

export default NotFoundSkeleton;
