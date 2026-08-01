import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md p-8">
        <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
        <p className="text-slate-600 mb-6">The page you are looking for does not exist.</p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
