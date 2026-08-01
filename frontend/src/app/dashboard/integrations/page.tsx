'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Phone, CheckCircle2, XCircle, Loader2, Plug } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface IntegrationStatus {
  configured: boolean;
  phoneNumberId: string | null;
}

const DEMO_WHATSAPP: IntegrationStatus = { configured: false, phoneNumberId: null };
const DEMO_VOICE: IntegrationStatus = { configured: false, phoneNumberId: null };

function IntegrationCard({
  icon: Icon,
  name,
  description,
  status,
  loading,
  requiredVars,
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  status: IntegrationStatus | null;
  loading: boolean;
  requiredVars: string[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{name}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {status?.configured ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-300" />
            )}
            <span className={status?.configured ? 'text-green-700 font-medium' : 'text-slate-500'}>
              {status?.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>

          {!status?.configured && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
              <p className="font-medium mb-1">Required variables:</p>
              <code className="block text-xs text-slate-600 font-mono">{requiredVars.join(', ')}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<IntegrationStatus | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setUseDemo(true);
        setLoading(false);
      }
    }, 3000);

    Promise.all([
      apiFetch<IntegrationStatus>('/whatsapp/status').catch(() => null),
      apiFetch<IntegrationStatus>('/voice/status').catch(() => null),
    ])
      .then(([w, v]) => {
        if (!cancelled) {
          clearTimeout(timer);
          setWhatsappStatus(w);
          setVoiceStatus(v);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timer);
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displayWhatsapp = useDemo ? DEMO_WHATSAPP : whatsappStatus;
  const displayVoice = useDemo ? DEMO_VOICE : voiceStatus;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Configure external channel integrations</p>
      </div>

      {useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>Could not connect to the server. Showing demo status.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <IntegrationCard
          icon={MessageSquare}
          name="WhatsApp"
          description="Conversational agent on the WhatsApp Business API"
          status={displayWhatsapp}
          loading={loading}
          requiredVars={['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN']}
        />

        <IntegrationCard
          icon={Phone}
          name="Voice AI"
          description="Bilingual virtual receptionist via Twilio"
          status={displayVoice}
          loading={loading}
          requiredVars={['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']}
        />
      </div>

      <div className="mt-8 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <Plug className="w-4 h-4 text-amber-600" />
            <p className="font-medium text-amber-900">Local environment</p>
          </div>
          <p>
            External service integrations (WhatsApp Cloud API, Twilio) require
            a tunnel like ngrok to receive webhooks. In production they point to the public domain.
          </p>
        </div>
      </div>
    </div>
  );
}
