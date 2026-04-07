import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Twitter, Linkedin, CheckCircle2, Link2 } from 'lucide-react';

export default function ConnectStep({ 
  connectedPlatforms, 
  onNext, 
  onBack 
}: { 
  connectedPlatforms: string[]; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [connecting, setConnecting] = useState<string | null>(null);

const handleConnect = async (platform: string) => {
    setConnecting(platform);
    
    try {
      const res = await fetch(`/api/accounts/quick-connect/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: 'pending', 
          returnTo: '/onboarding?connected=success' // Ensures they route back to the wizard
        }),
      });
      
      const data = await res.json();
      
      if (data.authUrl) {
        // Redirect to the OAuth provider
        window.location.href = data.authUrl;
      } else {
        console.error('Missing auth URL in response:', data);
        setConnecting(null);
        // Depending on your UI, you might want to show a toast/error state here
      }
    } catch (error) {
      console.error(`Failed to initialize ${platform} OAuth:`, error);
      setConnecting(null);
    }
  };

  const hasConnection = connectedPlatforms.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Connect your accounts</h2>
        <p className="text-sm text-zinc-500">Link your social profiles so we can start creating content in your voice.</p>
      </div>

      <div className="space-y-4">
        {/* Twitter Integration Card */}
        <div className={`p-5 rounded-xl border flex items-center justify-between transition-colors ${
          connectedPlatforms.includes('twitter') ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200 bg-white'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Twitter / X</h3>
              <p className="text-xs text-zinc-500">Build your audience with threads and engagement.</p>
            </div>
          </div>
          
          {connectedPlatforms.includes('twitter') ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Authorized
            </span>
          ) : (
            <button
              onClick={() => handleConnect('twitter')}
              disabled={connecting !== null}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {connecting === 'twitter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Connect
            </button>
          )}
        </div>

        {/* LinkedIn Integration Card */}
        <div className={`p-5 rounded-xl border flex items-center justify-between transition-colors ${
          connectedPlatforms.includes('linkedin') ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200 bg-white'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">LinkedIn</h3>
              <p className="text-xs text-zinc-500">Share your expertise and attract opportunities.</p>
            </div>
          </div>
          
          {connectedPlatforms.includes('linkedin') ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Authorized
            </span>
          ) : (
            <button
              onClick={() => handleConnect('linkedin')}
              disabled={connecting !== null}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {connecting === 'linkedin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <button
          onClick={onNext}
          disabled={!hasConnection}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}