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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
