import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size];

  const variantClasses = {
    primary: 'bg-graphite text-white hover:bg-graphite-dark shadow-silver-sm active:scale-[0.99] border border-graphite',
    secondary: 'bg-silver-light text-graphite hover:bg-silver border border-silver-border shadow-silver-sm active:scale-[0.99]',
    outline: 'bg-white text-graphite hover:bg-silver-light border border-silver-dark active:scale-[0.99]',
    ghost: 'bg-transparent text-graphite hover:bg-silver-light',
    danger: 'bg-financial-negative text-white hover:bg-red-700 shadow-silver-sm active:scale-[0.99]',
  }[variant];

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

