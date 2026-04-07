import { ArrowRight, Settings2 } from 'lucide-react';

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200">
        <Settings2 className="h-6 w-6 text-zinc-900" />
      </div>

      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Initialize System Parameters
        </h1>
        <p className="text-zinc-500 leading-relaxed max-w-lg">
          To deploy your autonomous growth engine, we need to establish your baseline integrations, define your target persona, and configure your deployment cadence.
        </p>
      </div>

      <div className="pt-4">
        <button
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
        >
          Begin Calibration
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}