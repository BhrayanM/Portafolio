import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-600 mb-6">La página que buscas no existe.</p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
