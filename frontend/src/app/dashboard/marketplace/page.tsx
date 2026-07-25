'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Bot, MessageSquare, Phone, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  description: string;
  price: 'included' | 'pro';
}

interface InstalledItem {
  id: string;
  installed: boolean;
  installed_at: string;
}

const iconMap: Record<string, React.ElementType> = {
  'lead-qualification': Bot,
  'whatsapp-agent': MessageSquare,
  'voice-receptionist': Phone,
  'sales-chat': MessageCircle,
};

export default function MarketplacePage() {
  const [catalog, setCatalog] = useState<Automation[]>([]);
  const [installed, setInstalled] = useState<InstalledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Automation[]>('/marketplace/catalog'),
      apiFetch<InstalledItem[]>('/marketplace/installed').catch(() => []),
    ])
      .then(([cat, inst]) => {
        setCatalog(cat);
        setInstalled(inst);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isInstalled = useCallback(
    (id: string) => installed.some((i) => i.id === id && i.installed),
    [installed]
  );

  const handleInstall = useCallback(async (workflowId: string) => {
    setInstalling(workflowId);
    try {
      await apiFetch('/marketplace/install', {
        method: 'POST',
        body: JSON.stringify({ workflow: workflowId }),
      });
      setInstalled((prev) => [...prev, { id: workflowId, installed: true, installed_at: new Date().toISOString() }]);
    } catch {
      /* error silencioso */
    } finally {
      setInstalling(null);
    }
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Marketplace</h1>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
      <p className="text-gray-500 text-sm mb-6">Automatizaciones disponibles para tu cuenta</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {catalog.map((item) => {
          const Icon = iconMap[item.id] || Bot;
          const installed_ = isInstalled(item.id);
          const isPro = item.price === 'pro';
          const installingThis = installing === item.id;

          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <Icon className="w-8 h-8 text-brand-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPro ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                }`}>
                  {isPro ? 'Pro' : 'Incluido'}
                </span>

                {installed_ ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Instalado
                  </span>
                ) : (
                  <button
                    onClick={() => handleInstall(item.id)}
                    disabled={installingThis}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    {installingThis ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Instalando...
                      </>
                    ) : (
                      'Instalar'
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
