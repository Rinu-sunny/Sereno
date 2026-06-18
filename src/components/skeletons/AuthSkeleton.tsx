import React from 'react';

const AuthSkeleton: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
    <div className="w-full max-w-md space-y-8 glass-panel rounded-2xl p-8">
      <div className="text-center space-y-2">
        <div className="h-8 w-48 bg-white/8 rounded mx-auto animate-pulse" />
        <div className="h-4 w-64 bg-white/6 rounded mx-auto animate-pulse" />
      </div>

      <div className="space-y-6">
        <div className="h-10 bg-white/6 rounded animate-pulse" />
        <div className="h-10 bg-white/6 rounded animate-pulse" />
        <div className="h-10 bg-white/6 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

export default AuthSkeleton;
