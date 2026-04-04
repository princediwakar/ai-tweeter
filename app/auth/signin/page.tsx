'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, TrendingUp, ArrowRight, Loader2, Brain, Cpu } from 'lucide-react';

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
        setError(result.error);
      } else {
        router.push('/');
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
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-primary cyber-glow" />
              <h1 className="text-3xl font-display-brutal text-foreground">AUTO_GROWTH</h1>
            </div>
            <p className="text-muted-foreground font-mono-brutal text-sm">
              AI THAT WORKS WHILE YOU SLEEP
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    SIGNING_IN...
                  </>
                ) : (
                  <>
                    START_GROWING
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm font-mono-brutal text-muted-foreground">
                NEW_HERE?{' '}
                <Link href="/auth/signup" className="text-primary hover:underline font-bold">
                  CREATE_ACCOUNT
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
              <span>FREE_FOREVER</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 bg-accent p-12 items-center justify-center border-l-4 border-border">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-sm font-mono-brutal text-primary">DAVID VS GOLIATH</span>
            </div>
            <h2 className="text-3xl font-display-brutal text-foreground">
              SMALL. FAST. DIFFERENT.
            </h2>
            <p className="text-muted-foreground">
              While the big guys (Buffer, Hootsuite, Later) focus on scheduling posts manually, 
              we built an AI that engages for you. Real-time. Personalized. Hands-free.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 border-2 border-primary bg-primary text-primary-foreground flex items-center justify-center font-mono-brutal text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-mono-brutal font-bold text-foreground">CONNECT</h4>
                <p className="text-sm text-muted-foreground">Link your Twitter account</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 border-2 border-secondary bg-secondary text-secondary-foreground flex items-center justify-center font-mono-brutal text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-mono-brutal font-bold text-foreground">CHOOSE NICHE</h4>
                <p className="text-sm text-muted-foreground">Tech, Finance, Cricket, etc.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 border-2 border-border bg-card text-foreground flex items-center justify-center font-mono-brutal text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-mono-brutal font-bold text-foreground">FORGET</h4>
                <p className="text-sm text-muted-foreground">AI grows your account 24/7</p>
              </div>
            </div>
          </div>

          <div className="border-2 border-primary/50 bg-primary/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-mono-brutal font-bold text-primary">THE DIFFERENCE</span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Goliaths charge $50-500/mo. We offer <span className="text-primary font-bold">free forever</span>.</p>
              <p>• Goliaths need your time. We <span className="text-primary font-bold">work while you sleep</span>.</p>
              <p>• Goliaths post content. We <span className="text-primary font-bold">build relationships</span>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}