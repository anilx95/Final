import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'ai' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center gap-1.5 font-semibold tracking-tight rounded-full border shrink-0';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-0.5',
  };

  const variantClasses = {
    brand: 'bg-[#eef4ff] text-[#1d3bb5] border-[#dbeafe]',
    ai: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    outline: 'bg-white text-slate-700 border-slate-200',
  };

  const dotColorClasses = {
    brand: 'bg-[#1d3bb5]',
    ai: 'bg-indigo-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    neutral: 'bg-slate-500',
    outline: 'bg-slate-400',
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorClasses[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      )}
      {children}
    </span>
  );
};
