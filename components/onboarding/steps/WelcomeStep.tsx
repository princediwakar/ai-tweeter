import { ArrowRight, Sparkles } from 'lucide-react';

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm">
        <Sparkles className="h-6 w-6 text-white" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Automate your social media
        </h1>
        <p className="text-zinc-500 leading-relaxed max-w-lg text-sm">
          Paste your website or blog link. We'll automatically draft ready-to-publish posts for Twitter & LinkedIn and set up your publishing schedule in under 60 seconds.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}