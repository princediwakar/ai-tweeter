// components/NavigationLayout.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User, ChevronDown, Zap, Shield, FileText } from 'lucide-react';

function UserDropdown({ user }: { user: any }) {
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
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-100 transition-colors border border-zinc-200/60 bg-white/80"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
          {user?.name?.[0]?.toUpperCase() || <User size={14} />}
        </div>
        <span className="text-xs font-semibold text-zinc-800 max-w-[120px] truncate hidden sm:inline-block">
          {user?.name || 'Account'}
        </span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <p className="text-xs font-bold text-zinc-900 truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{user?.email || ''}</p>
          </div>

          <div className="py-1">
            <Link
              href="/privacy"
              className="flex items-center px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Shield size={14} className="mr-2 text-zinc-400" />
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="flex items-center px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              onClick={() => setOpen(false)}
            >
              <FileText size={14} className="mr-2 text-zinc-400" />
              Terms of Service
            </Link>
          </div>

          <div className="border-t border-zinc-100 pt-1">
            <button
              className="flex items-center w-full px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            >
              <LogOut size={14} className="mr-2" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

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
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Loading AutoGrowth AI...</span>
        </div>
      </div>
    );
  }

  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-transparent text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white flex flex-col">
      {/* Sleek Top Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-zinc-200/70 shadow-[0_1px_12px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-900">
                AutoGrowth
              </span>
            </Link>
          </div>

          {/* Right Profile */}
          <div className="flex items-center gap-3">
            <UserDropdown user={session.user} />
          </div>
        </div>
      </header>

      {/* Main Command Center Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}