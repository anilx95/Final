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
    <div className={`text-center py-12 px-4 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 ${className}`}>
      {icon && (
        <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 shadow-sm">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <h4 className="text-sm font-bold text-[#111827] tracking-tight">{title}</h4>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
