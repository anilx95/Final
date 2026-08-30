import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full bg-[#080c14] border ${
            error ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : 'border-[#1b2538] focus:border-sky-500 focus:ring-sky-500/30'
          } focus:ring-1 rounded-lg ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } ${
            rightIcon ? 'pr-9' : 'pr-3.5'
          } py-2 text-xs text-slate-100 placeholder-slate-500 transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-slate-400 shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
