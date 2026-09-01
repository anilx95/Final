import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  count?: string | number;
}

export interface TabsProps {
  items?: TabItem[];
  tabs?: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) => {
  const tabList = items || tabs || [];

  return (
    <div className={`flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200 w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar ${className}`}>
      {tabList.map((tab) => {
        const isActive = activeTab === tab.id;
        const displayBadge = tab.badge !== undefined ? tab.badge : tab.count;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
            className={`flex items-center gap-2 rounded-lg font-semibold tracking-tight transition-all duration-150 whitespace-nowrap cursor-pointer ${
              size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
            } ${
              isActive
                ? 'bg-white text-[#1d3bb5] shadow-sm font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-[#111827] hover:bg-white/60'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {displayBadge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                isActive ? 'bg-[#eef4ff] text-[#1d3bb5]' : 'bg-slate-200 text-slate-600'
              }`}>
                {displayBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
