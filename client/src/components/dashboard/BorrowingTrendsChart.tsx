import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { MonthlyTrend } from '../../types';
import { TrendingUp } from 'lucide-react';

interface BorrowingTrendsChartProps {
  data: MonthlyTrend[];
  isLoading?: boolean;
}

export const BorrowingTrendsChart: React.FC<BorrowingTrendsChartProps> = ({
  data,
  isLoading = false,
}) => {
  const totalLoans = data.reduce((acc, curr) => acc + curr.loans, 0);

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-white/[0.08]">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" aria-hidden="true" />
            Monthly Circulation Volume
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Aggregated borrowing transactions over the past 6 calendar months
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Period</span>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            {isLoading ? '...' : `${totalLoans} loans`}
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        {isLoading ? (
          <div className="h-full w-full bg-white/[0.03] animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-500 font-mono">
            Loading trend metrics...
          </div>
        ) : data.length === 0 || totalLoans === 0 ? (
          <div className="h-full w-full border border-dashed border-white/[0.1] rounded-xl flex flex-col items-center justify-center text-xs text-slate-400 p-4 text-center">
            <p className="font-semibold text-slate-300 mb-1 font-sans">No historical borrowing data yet</p>
            <p className="text-slate-500 font-sans">Trend graph will populate as book loans are recorded.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="borrowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                  fontSize: '12px',
                  color: '#FFFFFF',
                }}
                labelStyle={{ fontWeight: 700, color: '#10B981', marginBottom: '2px', fontFamily: 'Space Grotesk' }}
                itemStyle={{ color: '#F8FAFC' }}
                formatter={(value: number) => [`${value} loans recorded`, 'Volume']}
              />
              <Area
                type="monotone"
                dataKey="loans"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#borrowGradient)"
                activeDot={{ r: 6, fill: '#10B981', stroke: '#080C14', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
