'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Bot, MessageSquare, Phone, Loader2, CheckCircle2, Sparkles, Star } from 'lucide-react';

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

const DEMO_CATALOG: Automation[] = [
  { id: 'lead-qualification', name: 'AI Lead Qualification', description: 'Clasifica leads automáticamente con IA y los sincroniza con HubSpot.', price: 'included' },
  { id: 'whatsapp-agent', name: 'WhatsApp Sales Assistant', description: 'Agente conversacional que califica leads y agenda reuniones por WhatsApp.', price: 'pro' },
  { id: 'voice-receptionist', name: 'Voice Receptionist', description: 'Recepcionista virtual bilingüe que toma mensajes y califica llamadas.', price: 'pro' },
];

const iconMap: Record<string, React.ElementType> = {
  'lead-qualification': Bot,
  'whatsapp-agent': MessageSquare,
  'voice-receptionist': Phone,
};

export default function MarketplacePage() {
  const [catalog, setCatalog] = useState<Automation[]>([]);
  const [installed, setInstalled] = useState<InstalledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setUseDemo(true);
        setLoading(false);
      }
    }, 3000);

    Promise.all([
      apiFetch<Automation[]>('/marketplace/catalog'),
      apiFetch<InstalledItem[]>('/marketplace/installed').catch(() => []),
    ])
      .then(([cat, inst]) => {
        if (!cancelled) {
          clearTimeout(timer);
          setCatalog(cat);
          setInstalled(inst);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearTimeout(timer);
          setError(e instanceof Error ? e.message : 'Error al cargar marketplace');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displayCatalog = useDemo ? DEMO_CATALOG : catalog;

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">Automatizaciones disponibles para tu cuenta</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>No se pudo conectar con el servidor. Mostrando automatizaciones de demostración.</span>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : displayCatalog.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center max-w-lg mx-auto">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay automatizaciones disponibles</p>
          <p className="text-slate-400 text-sm mt-1">Próximamente encontrarás aquí workflows listos para instalar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {displayCatalog.map((item) => {
            const Icon = iconMap[item.id] || Bot;
            const installed_ = isInstalled(item.id) || (useDemo && item.id === 'lead-qualification');
            const isPro = item.price === 'pro';
            const installingThis = installing === item.id;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col hover:border-indigo-200 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isPro ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                      {isPro && <Star className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isPro ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {isPro ? (
                      <>Pro <Star className="w-3 h-3" /></>
                    ) : (
                      'Incluido'
                    )}
                  </span>

                  {installed_ ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Instalado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInstall(item.id)}
                      disabled={installingThis}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
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
      )}
    </div>
  );
}
