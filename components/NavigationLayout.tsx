'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Calendar,
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
  { name: 'Growth', href: '/', icon: Zap },
  { name: 'Accounts', href: '/accounts', icon: Users },
  { name: 'Schedules', href: '/schedules', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
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
        variant="outline"
        size="icon"
        className="border-2 border-border bg-card text-foreground brutal-shadow-sm hover:bg-accent hover:text-accent-foreground"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={18} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border-2 border-border brutal-shadow z-50">
          <div className="p-1 border-b-2 border-border bg-accent">
            <p className="text-xs font-mono-brutal text-accent-foreground px-3 py-1">
              USER_CONTROLS
            </p>
          </div>
          <Link
            href="/settings"
            className="flex items-center px-4 py-3 text-foreground hover:bg-accent hover:text-accent-foreground border-b border-border transition-all duration-100"
            onClick={() => setOpen(false)}
          >
            <Settings size={18} className="mr-3" />
            <span className="font-mono-brutal text-sm">SETTINGS</span>
            <div className="ml-auto w-2 h-2 bg-primary rounded-full"></div>
          </Link>
          <button
            className="flex items-center w-full px-4 py-3 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-100"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <LogOut size={18} className="mr-3" />
            <span className="font-mono-brutal text-sm">SIGN_OUT</span>
            <div className="ml-auto w-2 h-2 bg-destructive rounded-full cyber-glow"></div>
          </button>
          <div className="p-2 border-t border-border bg-muted">
            <p className="text-[10px] font-mono-brutal text-muted-foreground text-center">
              SESSION_TERMINAL
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!session) {
    // If not authenticated, render children without sidebar
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar toggle - Brutalist Control */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="border-2 border-border bg-card text-foreground brutal-shadow-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cyber-glow"></div>
      </div>

      {/* Sidebar - Brutalist Command Center */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-background text-foreground transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col container-brutal">
          {/* Logo/Brand - Cyber-Brutalist Header */}
          <div className="p-6 border-b-4 border-border bg-accent">
            <h1 className="text-2xl font-display-brutal tracking-tight text-accent-foreground">
              AUTO_GROWTH
            </h1>
            <p className="text-sm font-mono-brutal text-muted-foreground mt-1">
              AI THAT WORKS WHILE YOU SLEEP
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-3 h-3 bg-primary cyber-glow"></div>
              <div className="w-3 h-3 bg-secondary cyber-glow"></div>
              <div className="w-3 h-3 bg-destructive cyber-glow"></div>
              <span className="text-xs font-mono-brutal text-muted-foreground ml-auto">
                v1.0
              </span>
            </div>
          </div>

          {/* Navigation - Brutalist Command Interface */}
          <nav className="flex-1 p-4 space-y-3 grid-overlay-dense">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-4 px-5 py-4 border-2 border-border brutal-shadow-sm transition-all duration-100 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1 hover:-translate-y-1'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={22} className={isActive ? 'text-primary-foreground' : ''} />
                  <span className={`font-mono-brutal text-sm tracking-wide ${isActive ? 'font-bold' : ''}`}>
                    {item.name.toUpperCase()}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-secondary rounded-full cyber-glow"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User menu - Brutalist Terminal Display */}
          <div className="p-4 border-t-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 border-2 border-border bg-accent flex items-center justify-center brutal-shadow-sm">
                  <User size={18} className="text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono-brutal font-bold truncate text-foreground">
                    {session.user?.name || 'USER'}
                  </p>
                  <p className="text-xs font-mono-brutal text-muted-foreground truncate mt-1">
                    {session.user?.email || 'NO_EMAIL_SET'}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-[10px] font-mono-brutal text-muted-foreground">
                      ACTIVE_SESSION
                    </span>
                  </div>
                </div>
              </div>
              <UserDropdown />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content - Brutalist Workspace */}
      <main className="lg:pl-72">
        <div className="p-6 md:p-8">{children}</div>
      </main>

      {/* Overlay for mobile - Brutalist Dimmer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground bg-opacity-80 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}