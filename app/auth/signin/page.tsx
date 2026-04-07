// app/auth/signin/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight, Loader2, Twitter } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        try {
          const statusRes = await fetch('/api/onboarding/status');
          const status = await statusRes.json();
          if (status.completed) {
            router.push('/');
          } else {
            router.push('/onboarding');
          }
        } catch {
          router.push('/');
        }
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Left Column - Auth */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-sm w-full space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <div className="bg-zinc-900 p-2 rounded-xl">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Welcome back</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Sign in to manage your automated growth engine.
            </p>
          </div>
{/* 
          <div className="space-y-4">
            <button 
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 hover:text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
            >
              <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              Continue with Twitter
            </button>
                        <button 
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 hover:text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
            >
              <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.25024 6.60998L5.32028 9.77C6.27525 6.79 9.00028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L20.18 21.28C22.57 19.08 23.49 15.96 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.54998C0.46 8.17998 0 10.0099 0 11.9999C0 13.9899 0.46 15.8199 1.28 17.4499L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 20.995L15.8404 17.815C14.7554 18.575 13.4454 19.03 12.0004 19.03C8.8754 19.03 6.13039 16.825 5.18039 13.825L1.10039 16.985C3.12539 21.055 7.2404 24 12.0004 24Z" fill="#34A853" />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-zinc-500">Or continue with email</span>
            </div>
          </div> */}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>

            <div className="text-center mt-4">
              <span className="text-sm text-zinc-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="font-semibold text-zinc-900 hover:underline">
                  Sign up
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column - Product Context */}
      <div className="hidden lg:flex lg:flex-1 bg-zinc-100 p-12 items-center justify-center">
        <div className="max-w-lg w-full">
          {/* Faux Dashboard Element to build trust */}
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">System Status: Active</div>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Performance Overview</h3>
                <p className="text-sm text-zinc-500">Last 24 hours of autonomous activity</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="text-sm text-zinc-500 mb-1">Engagements</div>
                  <div className="text-2xl font-semibold text-zinc-900">1,284</div>
                  <div className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 -rotate-45" /> +12% vs yesterday
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="text-sm text-zinc-500 mb-1">Profile Visits</div>
                  <div className="text-2xl font-semibold text-zinc-900">842</div>
                  <div className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 -rotate-45" /> +24% vs yesterday
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">AI Engine</div>
                  <div className="text-xs text-zinc-400">Running optimally</div>
                </div>
                <div className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}