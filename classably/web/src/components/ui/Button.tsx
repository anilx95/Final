import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50';

  const variantClasses = {
    primary: 'btn-primary bg-[#1d3bb5] hover:bg-[#173099] text-white !text-white font-bold shadow-sm focus:ring-[#1d3bb5]/40',
    secondary: 'btn-secondary bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 focus:ring-slate-300',
    outline: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 focus:ring-slate-300',
    ghost: 'btn-ghost bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-300',
    danger: 'btn-danger bg-rose-600 hover:bg-rose-700 text-white !text-white font-bold shadow-sm focus:ring-rose-500/50',
    ai: 'btn-ai bg-[#1d3bb5] hover:bg-[#173099] text-white !text-white font-bold shadow-sm focus:ring-[#1d3bb5]/40',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5',
    icon: 'p-2',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
