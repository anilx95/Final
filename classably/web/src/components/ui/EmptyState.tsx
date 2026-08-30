import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`text-center py-10 px-4 rounded-xl bg-[#080c14]/50 border border-dashed border-[#1b2538] flex flex-col items-center justify-center gap-3 ${className}`}>
      {icon && (
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <h4 className="text-sm font-bold text-slate-200 tracking-tight">{title}</h4>
        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
