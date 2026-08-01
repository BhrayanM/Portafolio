'use client';

import { useEffect, useState } from 'react';
import { activityApi } from '@/lib/api';
import type { LeadLogEntry } from '@/lib/types';
import { Activity as ActivityIcon, RefreshCw } from 'lucide-react';

const DEMO_ENTRIES: LeadLogEntry[] = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah@acme.com', source: 'webhook', status: 'HOT', ai_score: 87, created_at: '2026-07-25T10:30:00Z' },
  { id: 2, name: 'David Kim', email: 'david@innovate.io', source: 'api', status: 'WARM', ai_score: 65, created_at: '2026-07-24T15:20:00Z' },
  { id: 3, name: 'Emily Rodriguez', email: 'emily@bluegrassbuild.com', source: 'webhook', status: 'COLD', ai_score: 42, created_at: '2026-07-24T09:15:00Z' },
  { id: 4, name: 'James Wilson', email: 'jwilson@globalcorp.com', source: 'api', status: 'HOT', ai_score: 91, created_at: '2026-07-23T14:00:00Z' },
  { id: 5, name: 'Priya Patel', email: 'priya@brightpath.io', source: 'manual', status: 'WARM', ai_score: 55, created_at: '2026-07-22T11:45:00Z' },
  { id: 6, name: 'Michael Brown', email: 'michael@edunova.edu', source: 'webhook', status: 'COLD', ai_score: 38, created_at: '2026-07-21T16:30:00Z' },
  { id: 7, name: 'Rachel Adams', email: 'radams@techhub.com', source: 'api', status: 'HOT', ai_score: 78, created_at: '2026-07-20T08:00:00Z' },
  { id: 8, name: 'Chris Taylor', email: 'chris@boldagency.com', source: 'manual', status: 'WARM', ai_score: 48, created_at: '2026-07-19T13:20:00Z' },
];

export default function ActivityPage() {
  const [entries, setEntries] = useState<LeadLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setUseDemo(true);
        setLoading(false);
      }
    }, 3000);

    activityApi.list()
      .then((result) => {
        if (!cancelled) {
          clearTimeout(timer);
          setEntries(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearTimeout(timer);
          setError(e instanceof Error ? e.message : 'Error loading activity');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displayEntries = useDemo ? DEMO_ENTRIES : entries;

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-slate-500';
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'HOT': return 'bg-red-500';
      case 'WARM': return 'bg-yellow-500';
      case 'COLD': return 'bg-slate-400';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recent Activity</h1>
        <p className="text-sm text-slate-500 mt-1">Tracking of leads processed by the workflow</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>Could not connect to the server. Showing demo data.</span>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <ActivityIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No activity recorded yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">Lead events will appear here once the n8n workflow processes them.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {displayEntries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-slate-50 flex items-center gap-4 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full ${statusDot(entry.status)} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {entry.name || entry.email}
                  </p>
                  <p className="text-xs text-slate-500">
                    Classified as <span className="font-medium">{entry.status}</span> — Score: <span className={scoreColor(entry.ai_score)}>{entry.ai_score ?? 'N/A'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400 capitalize bg-slate-50 px-2 py-0.5 rounded-full">{entry.source}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
