'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

async function fetchWithAuth(url: string, token: string) {
  const res = await fetch(`${API}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching data');
  return res.json();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);

    fetchWithAuth('/auth/me', t)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
