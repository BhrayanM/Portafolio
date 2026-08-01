'use client';

import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import type { LeadStats } from '@/lib/types';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadsApi.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = stats
    ? [
        { label: 'Hot', value: stats.hot, color: 'bg-red-500', max: Math.max(stats.hot, stats.warm, stats.cold, 1) },
        { label: 'Warm', value: stats.warm, color: 'bg-yellow-500', max: Math.max(stats.hot, stats.warm, stats.cold, 1) },
        { label: 'Cold', value: stats.cold, color: 'bg-gray-400', max: Math.max(stats.hot, stats.warm, stats.cold, 1) },
      ]
    : [];

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-100 rounded" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={stats?.total ?? 0} />
        <StatCard label="Hoy" value={stats?.today ?? 0} />
        <StatCard label="Score Promedio" value={stats?.avg_score ?? 0} />
        <StatCard label="Nuevos" value={stats?.new ?? 0} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Distribución por Categoría</h2>
        {stats && stats.total > 0 ? (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{cat.label}</span>
                  <span className="text-gray-500">{cat.value}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(cat.value / cat.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8 text-sm">No hay datos suficientes para mostrar gráficos.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
