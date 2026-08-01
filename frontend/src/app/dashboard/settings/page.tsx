'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import type { ApiKey } from '@/lib/types';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.apiKeys()
      .then(setApiKeys)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar API keys'))
      .finally(() => setLoadingKeys(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Perfil</h2>
          <p className="text-sm text-gray-500 mb-4">
            La gestión de perfil se realiza desde el backend. Próximamente: edición de nombre y preferencias.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p><span className="font-medium text-gray-900">Email:</span> visible en el header</p>
            <p className="mt-1"><span className="font-medium text-gray-900">Rol:</span> asignado por el administrador del tenant</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tus claves de API para integraciones. Las claves completas solo se muestran al crearlas.
          </p>

          {loadingKeys ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500">No tienes API keys. Próximamente podrás crearlas desde aquí.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{key.label}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {key.prefix}•••••••••••{key.id.slice(-4)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {key.last_used_at ? `Último uso: ${new Date(key.last_used_at).toLocaleDateString()}` : 'Sin uso'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
