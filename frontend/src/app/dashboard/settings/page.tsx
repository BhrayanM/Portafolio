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
      .catch(e => setError(e instanceof Error ? e.message : 'Error loading API keys'))
      .finally(() => setLoadingKeys(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and API keys</p>
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
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
              <p className="text-sm text-slate-500">Account information</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
            <p><span className="font-medium text-slate-900">Email:</span> shown in the header</p>
            <p><span className="font-medium text-slate-900">Rol:</span> assigned by the tenant administrator</p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Name and preference editing will be available soon.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
              <p className="text-sm text-slate-500">Keys for external integrations</p>
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
              <p className="text-sm text-slate-500 font-medium">You have no API keys</p>
              <p className="text-xs text-slate-400 mt-1">You will be able to create them from this section soon.</p>
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
                    {key.last_used_at ? `Last used: ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}
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
