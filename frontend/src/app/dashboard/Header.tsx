'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { Menu } from 'lucide-react';
import type { User } from '@/lib/types';

export default function Header({ user, onMenuToggle }: { user: User | null; onMenuToggle: () => void }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">{user?.name || user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-red-600 transition-colors font-medium"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
