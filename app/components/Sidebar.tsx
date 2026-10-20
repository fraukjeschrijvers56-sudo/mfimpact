'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Klanten', href: '/klanten', icon: '👥' },
  { name: 'Scan & gatanalyse', href: '/scan', icon: '🔍' },
  { name: 'Wetgeving & drempels', href: '/wetgeving', icon: '📋' },
  { name: 'Claimcheck', href: '/claimcheck', icon: '✓' },
  { name: 'Instellingen', href: '/instellingen', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex flex-col w-64 bg-gray-800 min-h-screen">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <h1 className="text-white text-lg font-semibold">MVO-bewijs werkbank</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-3 text-sm font-medium rounded-md
                ${isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
        >
          Uitloggen
        </button>
      </div>
      <div className="p-4 text-xs text-gray-400 border-t border-gray-700">
        <p className="font-semibold mb-1">Disclaimer:</p>
        <p>Dit systeem ondersteunt het MVO-bewijsproces. Het is géén officiële certificeringsinstantie of keurmerk.</p>
      </div>
    </div>
  );
}
