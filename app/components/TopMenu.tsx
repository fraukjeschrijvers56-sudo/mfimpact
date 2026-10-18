'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LayoutDashboard, Users, Search, BookOpen, CheckCircle, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Klanten', href: '/klanten', icon: Users },
  { name: 'Scan & gatanalyse', href: '/scan', icon: Search },
  { name: 'Wetgeving & drempels', href: '/wetgeving', icon: BookOpen },
  { name: 'Claimcheck', href: '/claimcheck', icon: CheckCircle },
];

export default function TopMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-emerald-950/95 backdrop-blur-xl border-b border-emerald-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg"></div>
              <div>
                <h1 className="text-lg font-bold text-white">MVO-bewijs werkbank</h1>
                <p className="text-xs text-teal-200 -mt-0.5">ESG-bewijs voor MKB</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-teal-100 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Uitloggen</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-all"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-white/5 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-white/20 text-white'
                        : 'text-teal-100 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Uitloggen</span>
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* Spacer */}
      <div className="h-16"></div>
      
      {/* Disclaimer footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-slate-900/50 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <p className="text-xs text-slate-300 text-center">
            <span className="font-semibold">Disclaimer:</span> Dit systeem ondersteunt het MVO-bewijsproces. Het is géén officiële certificeringsinstantie of keurmerk.
          </p>
        </div>
      </div>
    </>
  );
}
