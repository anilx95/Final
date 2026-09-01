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
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantClasses = {
    default: 'bg-white border border-slate-200 shadow-sm',
    interactive: 'bg-white border border-slate-200 hover:border-[#1d3bb5]/40 hover:bg-[#eff4ff]/30 shadow-sm cursor-pointer',
    elevated: 'bg-slate-50 border border-slate-200 shadow-sm',
    ai: 'bg-white border border-[#dbeafe] shadow-sm hover:border-[#1d3bb5]/40',
    glass: 'bg-white/95 backdrop-blur-xl border border-slate-200 shadow-sm',
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
