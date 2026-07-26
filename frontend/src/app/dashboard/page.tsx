'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API}/leads/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Leads', value: stats?.total ?? '-', color: 'bg-blue-50 text-blue-700' },
    { label: 'Nuevos Hoy', value: stats?.today ?? '-', color: 'bg-green-50 text-green-700' },
    { label: 'Hot', value: stats?.hot ?? '-', color: 'bg-red-50 text-red-700' },
    { label: 'Score Promedio', value: stats?.avg_score ?? '-', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <div className="animate-pulse grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className={`${card.color} p-6 rounded-xl`}>
              <p className="text-sm opacity-75">{card.label}</p>
              <p className="text-3xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
