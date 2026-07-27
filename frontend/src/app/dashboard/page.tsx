'use client';

import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import type { LeadStats } from '@/lib/types';
import { Users, Sparkles, PlayCircle, TrendingUp, ArrowUpRight, Minus } from 'lucide-react';

const DEMO_STATS: LeadStats = {
  total: 1247,
  new: 28,
  hot: 183,
  warm: 421,
  cold: 643,
  avg_score: 62,
  today: 12,
};

const DEMO_METRICS = [
  { label: 'Leads Capturados', value: '1,247', icon: Users, trend: '+12%', trendUp: true, color: 'bg-blue-50 text-blue-600' },
  { label: 'Calificados por IA', value: '892', icon: Sparkles, trend: '+8%', trendUp: true, color: 'bg-purple-50 text-purple-600' },
  { label: 'Automatizaciones', value: '3', icon: PlayCircle, trend: 'Activas', trendUp: null, color: 'bg-green-50 text-green-600' },
  { label: 'Tasa de Conversión', value: '34%', icon: TrendingUp, trend: '+5%', trendUp: true, color: 'bg-indigo-50 text-indigo-600' },
];

export default function DashboardPage() {
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
          setError(e instanceof Error ? e.message : 'Error al cargar estadísticas');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displayStats = useDemo ? DEMO_STATS : stats;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Resumen de actividad de leads</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>No se pudo conectar con el servidor. Mostrando datos de demostración.</span>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {DEMO_METRICS.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg ${metric.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {metric.trendUp !== null && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${metric.trendUp ? 'text-green-600' : 'text-slate-400'}`}>
                        {metric.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {metric.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{metric.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribución de Leads</h2>
              {displayStats ? (
                <div className="space-y-4">
                  {[
                    { label: 'Hot', value: displayStats.hot, color: 'bg-red-500', max: Math.max(displayStats.hot, displayStats.warm, displayStats.cold, 1) },
                    { label: 'Warm', value: displayStats.warm, color: 'bg-yellow-500', max: Math.max(displayStats.hot, displayStats.warm, displayStats.cold, 1) },
                    { label: 'Cold', value: displayStats.cold, color: 'bg-slate-400', max: Math.max(displayStats.hot, displayStats.warm, displayStats.cold, 1) },
                  ].map((cat) => (
                    <div key={cat.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{cat.label}</span>
                        <span className="text-slate-500">{cat.value}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${(cat.value / cat.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8 text-sm">No hay datos disponibles.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumen Rápido</h2>
              {displayStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Leads Totales</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{displayStats.total.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Nuevos Hoy</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{displayStats.today}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Score Promedio</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{displayStats.avg_score}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Nuevos (7d)</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{displayStats.new}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8 text-sm">No hay datos disponibles.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
