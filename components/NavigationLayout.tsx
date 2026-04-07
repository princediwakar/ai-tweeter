// components/NavigationLayout.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, LogOut, User, ChevronDown, Menu, X, ListChecks, Zap } from 'lucide-react';
import { Button } from './ui/button';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Queue', href: '/queue', icon: ListChecks },
  { name: 'AI Profiles', href: '/profiles', icon: User },
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
        className="text-zinc-500 hover:text-zinc-900"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            className="flex items-center w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <LogOut size={16} className="mr-3" />
            <span className="text-sm font-medium">Sign out</span>
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
      .catch(() => {}); 
  }, [status, pathname, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
          <span className="text-sm font-medium uppercase tracking-widest">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-white border-zinc-200 shadow-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Brand */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-sm">
                <Zap size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                AutoGrowth AI
              </h1>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">
              Your workspace
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200/50'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={18} className={isActive ? "text-zinc-900" : "text-zinc-400"} />
                  <span className="text-sm font-medium">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
                  <User size={16} className="text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-zinc-900">
                    {session.user?.name || 'Administrator'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      Active
                    </span>
                  </div>
                </div>
              </div>
              <UserDropdown />
            </div>
          </div>
          <div className="p-3 border-t border-zinc-100 text-center">
            <div className="flex flex-wrap justify-center gap-3 text-[10px] text-zinc-500">
              <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-zinc-900 transition-colors">
                Terms
              </Link>
              <a href="mailto:support@autogrowth.ai" className="hover:text-zinc-900 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}