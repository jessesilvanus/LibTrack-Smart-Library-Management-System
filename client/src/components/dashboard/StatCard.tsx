import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'teal' | 'emerald' | 'amber' | 'rose' | 'sky';
  isLoading?: boolean;
}

const variantTheme = {
  primary: {
    iconBg: 'bg-white/[0.06] border border-white/10',
    iconColor: 'text-slate-200',
    accentBar: 'bg-slate-400',
    glow: 'group-hover:bg-slate-400/10',
  },
  teal: {
    iconBg: 'bg-emerald-500/15 border border-emerald-500/30',
    iconColor: 'text-emerald-400',
    accentBar: 'bg-emerald-400',
    glow: 'group-hover:bg-emerald-500/10',
  },
  emerald: {
    iconBg: 'bg-emerald-500/15 border border-emerald-500/30',
    iconColor: 'text-emerald-400',
    accentBar: 'bg-emerald-400',
    glow: 'group-hover:bg-emerald-500/10',
  },
  sky: {
    iconBg: 'bg-cyan-500/15 border border-cyan-500/30',
    iconColor: 'text-cyan-400',
    accentBar: 'bg-cyan-400',
    glow: 'group-hover:bg-cyan-500/10',
  },
  amber: {
    iconBg: 'bg-amber-500/15 border border-amber-500/30',
    iconColor: 'text-amber-400',
    accentBar: 'bg-amber-400',
    glow: 'group-hover:bg-amber-500/10',
  },
  rose: {
    iconBg: 'bg-rose-500/15 border border-rose-500/30',
    iconColor: 'text-rose-400',
    accentBar: 'bg-rose-400',
    glow: 'group-hover:bg-rose-500/10',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'teal',
  isLoading = false,
}) => {
  const theme = variantTheme[variant];

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
      {/* Ambient background glow on hover */}
      <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl transition-all duration-500 pointer-events-none opacity-0 group-hover:opacity-100 ${theme.glow}`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-9 w-20 bg-white/10 animate-pulse rounded-lg my-1" />
            ) : (
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {value.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center flex-shrink-0 shadow-inner`}>
          <Icon className={`w-5 h-5 ${theme.iconColor} stroke-[2.2]`} aria-hidden="true" />
        </div>
      </div>

      {subtext && (
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 relative z-10 font-sans">
          <span>{subtext}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${theme.accentBar} shadow-xs`} aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
