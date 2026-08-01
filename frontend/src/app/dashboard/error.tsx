'use client';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 mb-2">Error loading the dashboard</p>
        <p className="text-sm text-slate-400 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
