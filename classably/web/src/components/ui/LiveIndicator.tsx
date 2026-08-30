import React from 'react';

export interface LiveIndicatorProps {
  label?: string;
  variant?: 'live' | 'online' | 'offline' | 'ai';
  size?: 'sm' | 'md';
  className?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  label = 'LIVE',
  variant = 'live',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    live: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-500',
      ping: 'bg-rose-400',
    },
    online: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
    },
    offline: {
      bg: 'bg-slate-800/80 border-slate-700/60 text-slate-400',
      dot: 'bg-slate-500',
      ping: '',
    },
    ai: {
      bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
      dot: 'bg-indigo-400',
      ping: 'bg-indigo-400',
    },
  };

  const style = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-bold uppercase tracking-wider ${
        size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5'
      } ${style.bg} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {style.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.ping}`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${style.dot}`} />
      </span>
      <span>{label}</span>
    </span>
  );
};
