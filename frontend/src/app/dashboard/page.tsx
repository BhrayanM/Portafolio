'use client';

import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import type { LeadStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    leadsApi.stats()
      .then(setStats)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar estadísticas'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Leads', value: stats?.total ?? '-', color: 'bg-blue-50 text-blue-700' },
    { label: 'Nuevos Hoy', value: stats?.today ?? '-', color: 'bg-green-50 text-green-700' },
    { label: 'Hot', value: stats?.hot ?? '-', color: 'bg-red-50 text-red-700' },
    { label: 'Score Promedio', value: stats?.avg_score ?? '-', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className={`${card.color} p-6 rounded-xl`}>
              <p className="text-sm opacity-75">{card.label}</p>
              <p className="text-3xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {stats && stats.total === 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay leads registrados. Los leads aparecerán aquí cuando el workflow de n8n los procese.</p>
        </div>
      )}
    </div>
  );
}
