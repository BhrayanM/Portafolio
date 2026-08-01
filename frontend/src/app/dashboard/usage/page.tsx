'use client';

import { useEffect, useState } from 'react';
import { usageApi } from '@/lib/api';
import type { TenantUsage } from '@/lib/types';
import { Database, Activity, Users, Gauge } from 'lucide-react';

const DEMO_USAGE: TenantUsage = {
  total_leads: 1247,
  total_runs: 3892,
  total_users: 5,
};

export default function UsagePage() {
  const [usage, setUsage] = useState<TenantUsage | null>(null);
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

    usageApi.get()
      .then((result) => {
        if (!cancelled) {
          clearTimeout(timer);
          setUsage(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearTimeout(timer);
          setError(e instanceof Error ? e.message : 'Error al cargar el consumo del tenant');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displayUsage = useDemo ? DEMO_USAGE : usage;

  const metrics = displayUsage
    ? [
        { label: 'Total Leads', value: displayUsage.total_leads, icon: Database, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Ejecuciones', value: displayUsage.total_runs, icon: Activity, color: 'bg-green-50 text-green-600' },
        { label: 'Usuarios', value: displayUsage.total_users, icon: Users, color: 'bg-purple-50 text-purple-600' },
        { label: 'Promedio/Lead', value: displayUsage.total_runs > 0 ? (displayUsage.total_runs / Math.max(displayUsage.total_leads, 1)).toFixed(1) : '0', icon: Gauge, color: 'bg-amber-50 text-amber-600' },
      ]
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Consumo</h1>
        <p className="text-sm text-slate-500 mt-1">Estadísticas de uso del tenant</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>No se pudo conectar con el servidor. Mostrando datos de demostración.</span>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-100 rounded" />
          <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
      ) : !displayUsage ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center max-w-lg mx-auto">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay datos de consumo disponibles</p>
          <p className="text-slate-400 text-sm mt-1">Las estadísticas aparecerán cuando el sistema comience a procesar leads.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="block text-3xl font-bold text-slate-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              <span className="text-slate-500 text-sm">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
