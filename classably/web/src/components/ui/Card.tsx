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
  const baseClasses = 'rounded-lg transition-all duration-150 relative overflow-hidden';

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
  };

  const variantClasses = {
    default: 'bg-white border border-slate-200 shadow-sm',
    interactive: 'bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 shadow-sm cursor-pointer',
    elevated: 'bg-slate-50 border border-slate-200 shadow-sm',
    ai: 'bg-white border border-indigo-200 shadow-sm hover:border-indigo-300',
    glass: 'bg-white/90 backdrop-blur-xl border border-slate-200 shadow-sm',
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
