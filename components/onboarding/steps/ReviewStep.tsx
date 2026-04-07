import { ArrowLeft, ArrowRight, FileText, Twitter, Linkedin } from 'lucide-react';
import { OnboardingState, GeneratedPersona } from '@/types/onboarding';

export default function ReviewStep({ 
  state, 
  onNext, 
  onBack 
}: { 
  state: OnboardingState; 
  updateState: (s: Partial<OnboardingState>) => void;
  onNext: () => void; 
  onBack: () => void; 
}) {
  const { generatedPersonas } = state;
  const hasModels = generatedPersonas.twitter || generatedPersonas.linkedin;

  const renderModel = (platform: string, persona: GeneratedPersona, Icon: any) => (
    <div className="p-5 border border-zinc-200 rounded-xl space-y-4 bg-zinc-50/30">
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
        <Icon className="h-4 w-4 text-zinc-700" />
        <span className="text-sm font-semibold text-zinc-900 capitalize">{platform} Model</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tone</label>
          <p className="text-sm text-zinc-900 font-medium">{persona.tone || 'Analytical, Direct'}</p>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Focus Vectors</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {(persona.topics || ['Startups', 'SaaS', 'Growth']).map(topic => (
              <span key={topic} className="px-2 py-0.5 bg-zinc-200/50 text-zinc-700 rounded-md text-xs">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-1 pt-2">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Core Description</label>
        <p className="text-sm text-zinc-700 leading-relaxed">
          {persona.description || 'Configured to focus on high-leverage growth tactics and software scaling principles.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Review Generated Models</h2>
        <p className="text-sm text-zinc-500">Verify the algorithmic parameters before establishing the deployment schedule.</p>
      </div>

      <div className="space-y-4">
        {generatedPersonas.twitter && renderModel('twitter', generatedPersonas.twitter, Twitter)}
        {generatedPersonas.linkedin && renderModel('linkedin', generatedPersonas.linkedin, Linkedin)}
        
        {/* Fallback if skipping API during dev */}
        {!hasModels && (
           <div className="p-8 border border-zinc-200 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2 bg-zinc-50/50">
             <FileText className="h-6 w-6 text-zinc-400" />
             <p className="text-sm text-zinc-500">Default models will be applied based on your prompt.</p>
           </div>
        )}
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
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
        >
          Approve & Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}