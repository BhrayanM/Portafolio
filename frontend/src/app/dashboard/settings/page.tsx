export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Perfil</h2>
          <p className="text-sm text-gray-500">Configuración de perfil próximamente.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-gray-500">Gestión de API keys próximamente.</p>
        </div>
      </div>
    </div>
  );
}
