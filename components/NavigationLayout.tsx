'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Personas', href: '/personas', icon: User },
  { name: 'Accounts', href: '/accounts', icon: Users },
];

function UserDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="text-gray-500 hover:text-gray-900"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={18} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Management
            </p>
          </div>
          <Link
            href="/settings"
            className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Settings size={18} className="mr-3 text-gray-400" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <button
            className="flex items-center w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <LogOut size={18} className="mr-3" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Onboarding guard — redirect users who haven't completed setup
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (pathname === '/onboarding') return;

    fetch('/api/onboarding/status')
      .then(r => r.json())
      .then(data => {
        if (!data.completed) {
          router.push('/onboarding');
        }
      })
      .catch(() => {}); // Fail silently if migration not run yet
  }, [status, pathname, router]);

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-white border-gray-200 shadow-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Brand */}
          <div className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                AutoGrowth
              </h1>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
              Platform Main
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span className="text-sm font-medium">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <User size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-900">
                    {session.user?.name || 'User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-medium text-gray-400">
                      Active Session
                    </span>
                  </div>
                </div>
              </div>
              <UserDropdown />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-6 md:p-10">{children}</div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}