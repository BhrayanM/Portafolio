'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Phone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface IntegrationStatus {
  configured: boolean;
  phoneNumberId: string | null;
}

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {status?.configured ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-gray-300" />
            )}
            <span className={status?.configured ? 'text-green-700' : 'text-gray-500'}>
              {status?.configured ? 'Configurado' : 'No configurado'}
            </span>
          </div>

          {!status?.configured && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
              <p className="font-medium mb-1">Variables requeridas:</p>
              <code className="block text-xs">{requiredVars.join(', ')}</code>
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

  useEffect(() => {
    Promise.all([
      apiFetch<IntegrationStatus>('/whatsapp/status').catch(() => null),
      apiFetch<IntegrationStatus>('/voice/status').catch(() => null),
    ])
      .then(([w, v]) => {
        setWhatsappStatus(w);
        setVoiceStatus(v);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Integraciones</h1>
      <p className="text-gray-500 text-sm mb-6">
        Configura las integraciones con canales externos. Los valores se definen en las variables de entorno del servidor.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <IntegrationCard
          icon={MessageSquare}
          name="WhatsApp"
          description="Agente conversacional por WhatsApp Business API"
          status={whatsappStatus}
          loading={loading}
          requiredVars={['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN']}
        />

        <IntegrationCard
          icon={Phone}
          name="Voice AI"
          description="Recepcionista virtual bilingüe vía Twilio"
          status={voiceStatus}
          loading={loading}
          requiredVars={['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']}
        />
      </div>

      <div className="mt-8 max-w-3xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <p className="font-medium mb-1">Entorno local</p>
          <p>
            Las integraciones con servicios externos (WhatsApp Cloud API, Twilio) requieren
            un túnel como ngrok para recibir webhooks. En producción, apuntan al dominio público.
          </p>
        </div>
      </div>
    </div>
  );
}
