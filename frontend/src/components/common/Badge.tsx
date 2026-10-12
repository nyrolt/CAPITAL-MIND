import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'silver' | 'purple' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const variantClasses = {
    positive: 'bg-financial-positiveBg text-financial-positive border border-financial-positiveBorder',
    negative: 'bg-financial-negativeBg text-financial-negative border border-financial-negativeBorder',
    warning: 'bg-financial-warningBg text-financial-warning border border-financial-warningBorder',
    neutral: 'bg-silver-light text-graphite border border-silver-border',
    silver: 'bg-gradient-to-r from-silver-light to-platinum text-graphite border border-silver-dark/40 shadow-silver-sm',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};

