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
    <div className={`flex items-center gap-1 p-1 rounded-xl bg-[#080c14] border border-[#1b2538] w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar ${className}`}>
      {tabList.map((tab) => {
        const isActive = activeTab === tab.id;
        const displayBadge = tab.badge !== undefined ? tab.badge : tab.count;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
            className={`flex items-center gap-2 rounded-lg font-semibold tracking-tight transition-all duration-150 whitespace-nowrap ${
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
            } ${
              isActive
                ? 'bg-[#1b2538] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {displayBadge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
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
