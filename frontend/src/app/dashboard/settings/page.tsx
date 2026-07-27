'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import type { ApiKey } from '@/lib/types';
import { Key, User, RefreshCw } from 'lucide-react';

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Administra tu cuenta y claves de API</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Perfil</h2>
              <p className="text-sm text-slate-500">Información de tu cuenta</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
            <p><span className="font-medium text-slate-900">Email:</span> visible en el header</p>
            <p><span className="font-medium text-slate-900">Rol:</span> asignado por el administrador del tenant</p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            La edición de nombre y preferencias estará disponible próximamente.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
              <p className="text-sm text-slate-500">Claves para integraciones externas</p>
            </div>
          </div>

          {loadingKeys ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="bg-slate-50 rounded-lg p-8 text-center">
              <Key className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">No tienes API keys</p>
              <p className="text-xs text-slate-400 mt-1">Próximamente podrás crearlas desde esta sección.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{key.label}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {key.prefix}•••••••••••{key.id.slice(-4)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
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
