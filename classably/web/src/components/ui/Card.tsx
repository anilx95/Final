import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated' | 'ai' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'rounded-xl transition-all duration-150 relative overflow-hidden';

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
  };

  const variantClasses = {
    default: 'bg-[#0d131f] border border-[#1b2538] shadow-card',
    interactive: 'bg-[#0d131f] border border-[#1b2538] hover:border-[#25334c] hover:bg-[#121a2a] shadow-card cursor-pointer',
    elevated: 'bg-[#121a2a] border border-[#25334c] shadow-elevated',
    ai: 'bg-gradient-to-br from-[#0d131f] via-[#12162a] to-[#0d131f] border border-indigo-500/25 shadow-card hover:border-indigo-500/40',
    glass: 'bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 shadow-glass',
  };

  return (
    <div
      ref={ref}
      className={`${baseClasses} ${paddingClasses[padding]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
