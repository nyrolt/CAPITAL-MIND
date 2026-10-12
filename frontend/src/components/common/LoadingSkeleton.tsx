import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'chart' | 'text';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
}) => {
  const skeletons = Array.from({ length: count });

  if (type === 'table') {
    return (
      <div className="w-full bg-white rounded-2xl border border-silver-border p-4 animate-pulse space-y-4">
        <div className="h-6 bg-silver rounded w-1/4"></div>
        {skeletons.map((_, i) => (
          <div key={i} className="h-10 bg-silver-light rounded w-full"></div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="w-full h-72 bg-white rounded-2xl border border-silver-border p-6 animate-pulse flex flex-col justify-between">
        <div className="h-6 bg-silver rounded w-1/3"></div>
        <div className="h-44 bg-silver-light rounded-xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {skeletons.map((_, i) => (
        <div key={i} className="p-6 bg-white rounded-2xl border border-silver-border animate-pulse space-y-3">
          <div className="h-4 bg-silver rounded w-1/2"></div>
          <div className="h-8 bg-silver-dark rounded w-3/4"></div>
          <div className="h-3 bg-silver-light rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
};

