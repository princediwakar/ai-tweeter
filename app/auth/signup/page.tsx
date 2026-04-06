'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, TrendingUp, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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

      // Automatically sign in upon successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created, but failed to sign in automatically: ' + result.error);
      } else {
        router.push('/onboarding');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 bg-accent p-12 items-center justify-center border-r-4 border-border">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-sm font-mono-brutal text-primary">DAVID STRATEGY</span>
            </div>
            <h2 className="text-3xl font-display-brutal text-foreground">
              GROW WITHOUT THE GRIND
            </h2>
            <p className="text-muted-foreground">
              The big guys want you to pay $50-500/month to manually schedule posts.
              We built something different. AI that engages for you, while you focus on what matters.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
              <div>
                <h4 className="font-mono-brutal font-bold text-foreground">100% FREE FOREVER</h4>
                <p className="text-sm text-muted-foreground">No credit card. No trial. Just growth.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
              <div>
                <h4 className="font-mono-brutal font-bold text-foreground">AI THAT FEELS HUMAN</h4>
                <p className="text-sm text-muted-foreground">Personalized engagement, not generic auto-DMs</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
              <div>
                <h4 className="font-mono-brutal font-bold text-foreground">WORKS WHILE YOU SLEEP</h4>
                <p className="text-sm text-muted-foreground">24/7 engagement, automated</p>
              </div>
            </div>
          </div>

          <div className="border-2 border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-mono-brutal font-bold text-foreground">START SMALL, THINK BIG</span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>→ Connect 1 account</p>
              <p>→ Choose your niche</p>
              <p>→ Watch it grow</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-primary cyber-glow" />
              <h1 className="text-3xl font-display-brutal text-foreground">JOIN_AUTO_GROWTH</h1>
            </div>
            <p className="text-muted-foreground font-mono-brutal text-sm">
              START YOUR GROWTH JOURNEY
            </p>
          </div>

          <form className="mt-8 space-y-6 border-2 border-border p-6 bg-card brutal-shadow" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-mono-brutal text-foreground mb-2">
                  EMAIL_ADDRESS
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border bg-background text-foreground font-mono-brutal text-sm focus:outline-none focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-mono-brutal text-foreground mb-2">
                  PASSWORD
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border bg-background text-foreground font-mono-brutal text-sm focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-mono-brutal text-foreground mb-2">
                  CONFIRM_PASSWORD
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border bg-background text-foreground font-mono-brutal text-sm focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-destructive font-mono-brutal text-sm text-center border-2 border-destructive p-2">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border-2 border-border bg-primary text-primary-foreground font-mono-brutal text-sm font-bold hover:bg-primary/90 brutal-shadow disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    CREATING_ACCOUNT...
                  </>
                ) : (
                  <>
                    START_GROWING_NOW
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm font-mono-brutal text-muted-foreground">
                ALREADY_HAVE_ACCOUNT?{' '}
                <Link href="/auth/signin" className="text-primary hover:underline font-bold">
                  SIGN_IN
                </Link>
              </span>
            </div>
          </form>

          <div className="flex items-center justify-center gap-4 text-xs font-mono-brutal text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span>NO_CREDIT_CARD</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              <span>100%_FREE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}