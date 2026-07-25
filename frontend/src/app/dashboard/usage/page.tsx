'use client';

import { useEffect, useState } from 'react';
import { usageApi } from '@/lib/api';
import type { ApiUsage } from '@/lib/types';

export default function UsagePage() {
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usageApi.get()
      .then(setUsage)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar uso de API'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Uso de API</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
          </div>
        )}
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-100 rounded" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Uso de API</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        {usage ? (
          <div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-3xl font-bold">{usage.total.toLocaleString()}</span>
              <span className="text-gray-500 text-sm">peticiones</span>
            </div>

            {usage.period && (
              <p className="text-xs text-gray-400 mb-4">
                Período: {new Date(usage.period.from).toLocaleDateString()} — {new Date(usage.period.to).toLocaleDateString()}
              </p>
            )}

            {usage.by_endpoint && Object.keys(usage.by_endpoint).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Por endpoint</h3>
                <div className="space-y-2">
                  {Object.entries(usage.by_endpoint).map(([endpoint, count]) => (
                    <div key={endpoint} className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-600 flex-1 truncate">{endpoint}</span>
                      <div className="h-2 bg-gray-100 rounded-full flex-1 max-w-xs overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(count / usage.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500 text-sm">No hay datos de uso disponibles.</p>
            <p className="text-gray-400 text-xs mt-1">
              El endpoint <code className="bg-gray-100 px-1 rounded">/usage</code> debe implementarse en el backend.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
