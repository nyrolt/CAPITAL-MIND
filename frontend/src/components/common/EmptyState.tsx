import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-2xl border border-silver-border shadow-silver-sm">
      {icon && (
        <div className="p-4 mb-4 rounded-2xl bg-silver-light border border-silver-border text-graphite">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-graphite">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      {actionText && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionText}</Button>
        </div>
      )}
    </div>
  );
};

