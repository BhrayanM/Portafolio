'use client';

import { useEffect, useState } from 'react';
import { activityApi } from '@/lib/api';
import type { LeadLogEntry } from '@/lib/types';
import { Activity as ActivityIcon } from 'lucide-react';

export default function ActivityPage() {
  const [entries, setEntries] = useState<LeadLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    activityApi.list()
      .then(setEntries)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar actividad'))
      .finally(() => setLoading(false));
  }, []);

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Actividad</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
          </div>
        )}
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Actividad Reciente</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <ActivityIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay actividad registrada aún.</p>
            <p className="text-gray-400 text-xs mt-1">Los eventos de leads aparecerán aquí cuando el workflow de n8n los procese.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.name || entry.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Lead {entry.status} — Score: <span className={scoreColor(entry.ai_score)}>{entry.ai_score ?? 'N/A'}</span>
                  </p>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(entry.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Nota: El endpoint <code className="bg-gray-100 px-1 rounded">/leads/activity</code> debe implementarse en el backend para mostrar datos reales.
      </p>
    </div>
  );
}
