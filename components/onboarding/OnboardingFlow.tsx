'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, ArrowRight, Loader2, Brain, CheckCircle, Rocket, Wand2 } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  account_username: string;
  status: string;
  twitter_oauth2_enabled: boolean;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const accountsRes = await fetch('/api/accounts');
      
      if (!accountsRes.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const accountsData = await accountsRes.json();
      setAccounts(accountsData.accounts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    router.push('/accounts');
  };

  if (loading) {
    return <MagicLoader />;
  }

  if (accounts.length === 0) {
    return <MagicOnboarding onConnect={handleConnect} connecting={connecting} />;
  }

  return <MagicDashboard accounts={accounts} onAddMore={handleConnect} />;
}

function MagicLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-96 relative">
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <Brain className="h-16 w-16 text-primary" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"></div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i} 
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-8 font-mono-brutal text-sm text-muted-foreground">ANALYZING_YOUR_ACCOUNT...</p>
    </div>
  );
}

function MagicOnboarding({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-secondary/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10 py-16">
        {/* Hero icon */}
        <div className="relative inline-block mb-8">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center brutal-shadow-lg">
            <Wand2 className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="absolute -right-2 -bottom-2">
            <Sparkles className="h-6 w-6 text-secondary animate-pulse" />
          </div>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl font-display-brutal text-foreground mb-4">
          GROW <span className="gradient-text-shimmer">WITHOUT</span> THE GRIND
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          Connect your Twitter. That's it. Our AI handles everything else - 
          finding content, engaging, and growing your presence.
        </p>

        {/* CTA Button */}
        <div className="inline-block">
          <Button
            onClick={onConnect}
            disabled={connecting}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="group relative px-8 py-4 bg-primary text-primary-foreground font-mono-brutal text-lg font-bold brutal-shadow-lg hover:translate-y-[-2px] transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-3">
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  CONNECTING...
                </>
              ) : (
                <>
                  <Rocket className={`h-5 w-5 transition-transform ${hovered ? 'rotate-45' : ''}`} />
                  START_GROWING_FREE
                </>
              )}
              <ArrowRight className={`h-5 w-5 transition-transform ${hovered ? 'translate-x-1' : ''}`} />
            </span>
            
            {/* Shine effect */}
            <div className="absolute inset-0 overflow-hidden rounded-inherit">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </div>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-secondary" />
            <span className="font-mono-brutal">NO_CREDIT_CARD</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-secondary" />
            <span className="font-mono-brutal">SET_AND_FORGET</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-secondary" />
            <span className="font-mono-brutal">100%_FREE</span>
          </div>
        </div>

        {/* Magic steps - shown as magic happening */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { icon: Zap, title: 'CONNECT', desc: 'One click' },
            { icon: Brain, title: 'LEARN', desc: 'AI studies your niche' },
            { icon: Rocket, title: 'GROW', desc: 'Works 24/7' }
          ].map((step, i) => (
            <div 
              key={i}
              className="p-4 border-2 border-border/50 bg-card/30 backdrop-blur-sm rounded-lg"
            >
              <step.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-mono-brutal text-xs font-bold">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MagicDashboard({ accounts, onAddMore }: { 
  accounts: Account[]; 
  onAddMore: () => void;
}) {
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.twitter_oauth2_enabled).length;

  return (
    <div className="space-y-8 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Status Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent rounded-2xl blur-xl"></div>
        <div className="relative border-2 border-primary/30 bg-card/50 backdrop-blur-sm rounded-2xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <span className="font-mono-brutal text-primary text-sm">MAGIC_ACTIVE</span>
              </div>
              <h2 className="text-2xl font-display-brutal text-foreground">
                {activeAccounts > 0 ? `${activeAccounts} ACCOUNT${activeAccounts > 1 ? 'S' : ''} GROWING` : 'READY TO GROW'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {activeAccounts > 0 
                  ? 'AI is engaging with your niche. Check back tomorrow for results.'
                  : 'Connect your Twitter account to start the magic.'}
              </p>
            </div>
            
            {activeAccounts === 0 && (
              <Button
                onClick={onAddMore}
                className="px-6 py-3 bg-primary text-primary-foreground font-mono-brutal font-bold brutal-shadow hover:translate-y-[-2px] transition-all"
              >
                <Zap className="h-4 w-4 mr-2" />
                CONNECT_ACCOUNT
              </Button>
            )}
          </div>

          {/* Live stats when active */}
          {activeAccounts > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/50">
              <div className="text-center">
                <p className="text-3xl font-display-brutal text-primary">-</p>
                <p className="text-xs text-muted-foreground font-mono-brutal mt-1">ENGAGEMENTS</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display-brutal text-secondary">-</p>
                <p className="text-xs text-muted-foreground font-mono-brutal mt-1">FOLLOWERS</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display-brutal text-foreground">{activeAccounts}</p>
                <p className="text-xs text-muted-foreground font-mono-brutal mt-1">ACTIVE_ACCOUNTS</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Minimal */}
      {activeAccounts > 0 && (
        <div className="flex gap-4">
          <Button
            onClick={onAddMore}
            variant="outline"
            className="border-2 border-border bg-card font-mono-brutal"
          >
            <Zap className="h-4 w-4 mr-2" />
            ADD_ANOTHER_ACCOUNT
          </Button>
        </div>
      )}

      {/* What happens next - educational but minimal */}
      {activeAccounts > 0 && (
        <div className="border border-border/30 bg-card/30 rounded-xl p-6">
          <h3 className="font-mono-brutal text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            WHILE_YOU_SLEEP
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span>AI finds relevant content in your niche</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-secondary">→</span>
              <span>Generates personalized replies</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span>Builds relationships automatically</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}