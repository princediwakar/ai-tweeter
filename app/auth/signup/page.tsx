// app/auth/signup/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight, Loader2, CheckCircle2, Twitter, Linkedin } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [oauthLoading, setOauthLoading] = useState<'linkedin' | null>(null);

  const handleOAuthSignUp = async (provider: 'linkedin') => {
    setOauthLoading(provider);
    setError('');
    
    try {
      await signIn(provider, { callbackUrl: '/onboarding' });
    } catch (err) {
      setError(`Failed to sign up with ${provider}. Please try again.`);
      setOauthLoading(null);
    }
  };

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
              <span className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">AutoGrowth AI</span>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-white leading-tight">
              Build your brand.<br />Grow your influence. Automatically.
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed">
              Build your personal brand with AI-powered content that captures your authentic voice.
              Grow your audience and establish authority while you focus on what matters.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-zinc-300 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Authentic Brand Voice</h4>
                <p className="text-zinc-400 mt-1">Content that captures your unique voice and resonates with your audience.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-zinc-300 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Continuous Brand Growth</h4>
                <p className="text-zinc-400 mt-1">Your brand builds authority and audience while you focus on what matters most.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-zinc-300 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">Simple Setup</h4>
                <p className="text-zinc-400 mt-1">Connect your channels, define your brand, and see your influence grow.</p>
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
              Start building your brand on LinkedIn and Twitter automatically.
            </p>
          </div>

          <div className="space-y-4">
            <button 
              type="button"
              onClick={() => handleOAuthSignUp('linkedin')}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 hover:text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'linkedin' ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#0A66C2]" />
              ) : (
                <Linkedin className="h-5 w-5 text-[#0A66C2]" />
              )}
              {oauthLoading === 'linkedin' ? 'Connecting...' : 'Continue with LinkedIn'}
            </button>
          </div> 
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-zinc-500">Or continue with email</span>
            </div>
          </div>

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

            <div className="pt-6 mt-6 border-t border-zinc-200 text-center">
              <div className="flex flex-wrap justify-center gap-4 text-xs text-zinc-500">
                <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-zinc-900 transition-colors">
                  Terms of Service
                </Link>
                <a href="mailto:support@autogrowth.ai" className="hover:text-zinc-900 transition-colors">
                  Contact
                </a>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                © {new Date().getFullYear()} AutoGrowth AI. All rights reserved.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}