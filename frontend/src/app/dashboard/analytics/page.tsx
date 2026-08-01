'use client';

import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import type { LeadStats } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DEMO_STATS: LeadStats = {
  total: 1247,
  new: 28,
  hot: 183,
  warm: 421,
  cold: 643,
  avg_score: 62,
  today: 12,
};

const PERIOD_DATA = [
  { label: 'Wk 1', leads: 180, scored: 165 },
  { label: 'Wk 2', leads: 210, scored: 190 },
  { label: 'Wk 3', leads: 195, scored: 178 },
  { label: 'Wk 4', leads: 240, scored: 220 },
  { label: 'Wk 5', leads: 225, scored: 205 },
  { label: 'Wk 6', leads: 260, scored: 238 },
];

const CONVERSION_DATA = [
  { label: 'Visitors', value: 3650, color: 'bg-slate-200' },
  { label: 'Leads', value: 1247, color: 'bg-indigo-400' },
  { label: 'Qualified', value: 892, color: 'bg-indigo-500' },
  { label: 'Opportunities', value: 412, color: 'bg-indigo-600' },
  { label: 'Customers', value: 156, color: 'bg-green-500' },
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setUseDemo(true);
        setLoading(false);
      }
    }, 3000);

    leadsApi.stats()
      .then((result) => {
        if (!cancelled) {
          clearTimeout(timer);
          setStats(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearTimeout(timer);
          setError(e instanceof Error ? e.message : 'Error loading analytics');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displayStats = useDemo ? DEMO_STATS : stats;

  const categories = displayStats
    ? [
        { label: 'Hot', value: displayStats.hot, color: 'bg-red-500', max: Math.max(displayStats.hot, displayStats.warm, displayStats.cold, 1) },
        { label: 'Warm', value: displayStats.warm, color: 'bg-yellow-500', max: Math.max(displayStats.hot, displayStats.warm, displayStats.cold, 1) },
        { label: 'Cold', value: displayStats.cold, color: 'bg-slate-400', max: Math.max(displayStats.hot, displayStats.warm, displayStats.cold, 1) },
      ]
    : [];

  const maxPeriod = Math.max(...PERIOD_DATA.map(p => p.leads), 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Lead metrics and distribution</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>Could not connect to the server. Showing demo data.</span>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-100 rounded" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Leads" value={displayStats?.total ?? 0} trend="+12%" up />
            <StatCard label="New (Today)" value={displayStats?.today ?? 0} trend="+3" up />
            <StatCard label="Average Score" value={displayStats?.avg_score ?? 0} trend={null} up={null} />
            <StatCard label="Conversion Rate" value={displayStats ? Math.round((displayStats.hot / Math.max(displayStats.total, 1)) * 100) + '%' : '0%'} trend="+5%" up />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Leads per Period</h2>
              {useDemo ? (
                <div className="space-y-2">
                  {PERIOD_DATA.map((p) => (
                    <div key={p.label}>
                      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                        <span>{p.label}</span>
                        <span>{p.leads}</span>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${(p.leads / maxPeriod) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8 text-sm">Connect the backend to see per-period data.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Conversion Funnel</h2>
              {useDemo ? (
                <div className="space-y-3">
                  {CONVERSION_DATA.map((step) => (
                    <div key={step.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{step.label}</span>
                        <span className="font-medium text-slate-800">{step.value.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full transition-all duration-500`}
                          style={{ width: `${(step.value / CONVERSION_DATA[0].value) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8 text-sm">Connect the backend to see the conversion funnel.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Category Distribution</h2>
            {displayStats && displayStats.total > 0 ? (
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{cat.label}</span>
                      <span className="text-slate-500">{cat.value}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(cat.value / cat.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8 text-sm">Not enough data to display charts.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, trend, up }: { label: string; value: number | string; trend: string | null; up: boolean | null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-500">{label}</p>
        {trend !== null && up !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
        {trend === null && (
          <Minus className="w-3 h-3 text-slate-300" />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
