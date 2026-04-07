// app/auth/signup/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight, Loader2, CheckCircle2, Github, Twitter } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to register account');
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created, but automatic sign-in failed.');
      } else {
        router.push('/onboarding');
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
      {/* Left Column - Value Prop */}
      <div className="hidden lg:flex lg:flex-1 bg-zinc-950 p-12 items-center justify-center text-zinc-50">
        <div className="max-w-lg space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-2 rounded-xl">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">AutoGrowth</span>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-white leading-tight">
              Scale your social presence.<br />Zero manual effort.
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed">
              Stop paying for expensive scheduling tools that still require your time. 
              Our AI engages, grows, and builds relationships for you natively.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-zinc-300 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Hyper-Personalized AI</h4>
                <p className="text-zinc-400 mt-1">Context-aware engagement that sounds exactly like you, not a bot.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-zinc-300 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">24/7 Autonomous Growth</h4>
                <p className="text-zinc-400 mt-1">Your account builds authority and audience while you focus on deep work.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-zinc-300 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Frictionless Setup</h4>
                <p className="text-zinc-400 mt-1">Connect your account, define your niche, and see results in hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-sm w-full space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Create an account</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Start building your presence on LinkedIn and Twitter automatically.
            </p>
          </div>

          {/* <div className="space-y-4">
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
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>

            <div className="text-center mt-4">
              <span className="text-sm text-zinc-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="font-semibold text-zinc-900 hover:underline">
                  Log in
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}