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
    brand: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    ai: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    neutral: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    outline: 'bg-transparent text-slate-300 border-slate-800',
  };

  const dotColorClasses = {
    brand: 'bg-sky-400',
    ai: 'bg-indigo-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-300',
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
