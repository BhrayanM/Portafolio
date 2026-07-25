'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, Users, BarChart3, Settings, CreditCard, Activity, Terminal, Puzzle, Store } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/activity', label: 'Actividad', icon: Activity },
  { href: '/dashboard/billing', label: 'Facturación', icon: CreditCard },
  { href: '/dashboard/integrations', label: 'Integraciones', icon: Puzzle },
  { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/usage', label: 'Uso de API', icon: Terminal },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 p-4 transform transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="text-xl font-bold mb-8 px-3">Portafolio</div>
        <nav className="space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
