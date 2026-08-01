'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-md p-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Error</h1>
            <p className="text-slate-500 mb-6">Something went wrong.</p>
            <p className="text-sm text-slate-400 mb-6 font-mono bg-slate-100 p-3 rounded-lg truncate">
              {error.message}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
