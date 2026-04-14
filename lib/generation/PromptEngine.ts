// lib/generation/PromptEngine.ts
// Unified prompt building - handles single tweets, threads, and batch generation
// Consolidated logic with refined focus on high-signal, data-backed, human-like synthesis

import type { Persona } from "../types";
import type { ContextBuilderResult } from "./ContextBuilder";

export interface PromptEngineInput {
  persona: Persona;
  dataContext: string;
  formatRules?: string[];
  options?: {
    isThread?: boolean;
    threadTemplate?: string;
    threadCount?: number;
    topic?: string;
    userTopicContext?: string;
    wantsImage?: boolean;
    previousHeadlines?: number[];
    usedSourceUrls?: string[];
  };
}

export interface PromptEngineOutput {
  prompt: string;
  formatMetadata: {
    isThread: boolean;
    outputSchema: string;
  };
}

/**
 * Unified PromptEngine - now optimized for the exact style requested:
 * data-first, synthesized insights, grounded opinions, natural human flow,
 * complete standalone value with zero source references.
 */
export class PromptEngine {
  
  /**
   * Build a generation prompt
   */
  build(input: PromptEngineInput): PromptEngineOutput {
    const { persona, dataContext, formatRules = [], options = {} } = input;
    const pConfig = (persona.config as Record<string, unknown>) || {};
    
    const isThread = options.isThread || false;
    const threadCount = options.threadCount || 5;
    
    // Build DNA components from persona config
    const identityContext = String(pConfig.identity_context || pConfig.core_thesis || 'You are a sharp industry observer.');
    
    // Refined defaultSourceLogic - fully aligned with the requested style
    const defaultSourceLogic = `BEFORE DECIDING WHAT TO POST:
Evaluate each article in the context (ARTICLE 1, 2, etc.):
- Is it TIMELY and contains specific, material data or operational details?
- Does it allow for meaningful contrasts or execution insights?
- Can it be synthesized into a high-signal post that a professional audience would find valuable?

Only proceed if at least one article passes. If none do, return: {"content": "No suitable material today."}

YOUR JOB: Deeply internalize the facts. Then write the post as your own original, synthesized observation — exactly as a seasoned expert would share it after studying the space.

- Start with a factual hook + immediate data or contrast
- Build with specific numbers, operational realities, and meaningful contrasts
- End with a grounded insight or quiet opinion about broader implications
- The post must stand completely alone and deliver full material value
- NEVER mention any source, article, filing, announcement, or external reference
- Write in natural first person with human rhythm and conversational precision
- The reader should feel they just received high-signal information worth their time — facts, insights, and professional observation only.`;

    const sourceLogic = String(pConfig.source_logic || defaultSourceLogic);
    const voiceDna = String(pConfig.voice_dna || pConfig.voice || 'Write with precise, observant, conversational authority.');
    const antiPatterns = String(pConfig.anti_patterns || 'Avoid generic filler, hype, or any source references.');
    const coreThesis = String(pConfig.core_thesis || '');
    const theEnemy = String(pConfig.the_enemy || '');
    const analyticalFramework = String(pConfig.analytical_framework || '');
    const framingBias = String(pConfig.framing_bias || '');
    const hookMechanics = String(pConfig.hook_mechanics || '');
    
    const rawArchetypes = pConfig.structural_archetypes;
    const structuralArchetypes = Array.isArray(rawArchetypes) ? rawArchetypes : [];
    
    const rawChecklist = pConfig.validation_checklist;
    const validationChecklist = Array.isArray(rawChecklist) ? rawChecklist : [];
    
    let prompt = '';
    
    if (isThread) {
      prompt = this.buildThreadPrompt({
        persona,
        dataContext,
        identityContext,
        sourceLogic,
        voiceDna,
        antiPatterns,
        coreThesis,
        theEnemy,
        analyticalFramework,
        framingBias,
        hookMechanics,
        structuralArchetypes,
        validationChecklist,
        threadCount,
        threadTemplate: options.threadTemplate,
        formatRules,
        usedSourceUrls: options.usedSourceUrls,
      });
    } else {
      prompt = this.buildSingleTweetPrompt({
        persona,
        dataContext,
        identityContext,
        sourceLogic,
        voiceDna,
        antiPatterns,
        coreThesis,
        theEnemy,
        analyticalFramework,
        framingBias,
        hookMechanics,
        structuralArchetypes,
        validationChecklist,
        formatRules,
        wantsImage: options.wantsImage,
        topic: options.topic,
        previousHeadlines: options.previousHeadlines,
        usedSourceUrls: options.usedSourceUrls,
      });
    }
    
    return {
      prompt,
      formatMetadata: {
        isThread,
        outputSchema: isThread ? 'json_array' : 'json_object',
      },
    };
  }
  
  private buildSingleTweetPrompt(params: {
    persona: Persona;
    dataContext: string;
    identityContext: string;
    sourceLogic: string;
    voiceDna: string;
    antiPatterns: string;
    coreThesis: string;
    theEnemy: string;
    analyticalFramework: string;
    framingBias: string;
    hookMechanics: string;
    structuralArchetypes: any[];
    validationChecklist: any[];
    formatRules: string[];
    wantsImage?: boolean;
    topic?: string;
    previousHeadlines?: number[];
    usedSourceUrls?: string[];
  }): string {
    const {
      persona,
      dataContext,
      identityContext,
      sourceLogic,
      voiceDna,
      antiPatterns,
      coreThesis,
      theEnemy,
      analyticalFramework,
      framingBias,
      hookMechanics,
      structuralArchetypes,
      validationChecklist,
      formatRules,
      wantsImage,
      topic,
      previousHeadlines,
      usedSourceUrls,
    } = params;
    
    let prompt = `You are ${persona.name}. ${identityContext}\n\n${persona.description || ''}\n\n`;
    
    if (topic) {
      prompt += `USER REQUEST: Write a post about "${topic}"\n\n`;
    } else if (topic) {
      prompt += `USER REQUEST: Write a post about "${topic}"\n\n`;
    } else if (dataContext) {
      prompt += `Right now you have this fresh context from your sources:\n${dataContext}\n\n`;
      
      if (previousHeadlines && previousHeadlines.length > 0) {
        prompt += `You've already used these headlines: ${previousHeadlines.join(', ')}. Pick something new.\n`;
      }
      
      if (usedSourceUrls && usedSourceUrls.length > 0) {
        prompt += `Do not use these articles again:\n${usedSourceUrls.map(url => `- ${url}`).join('\n')}\n`;
      }
    } else {
      prompt += `No specific news provided. Draw on your general industry knowledge.\n\n`;
    }
    
    if (coreThesis || theEnemy || analyticalFramework) {
      prompt += `YOUR PSYCHOLOGICAL DNA:\n`;
      if (coreThesis) prompt += `- Core Thesis: ${coreThesis}\n`;
      if (theEnemy) prompt += `- The Enemy: ${theEnemy}\n`;
      if (analyticalFramework) prompt += `- Analytical Framework: ${analyticalFramework}\n`;
      prompt += '\n';
    }
    
    prompt += `Follow these rules exactly:\n${sourceLogic}\n\n`;
    
    prompt += `Write exactly like a real, sharp industry observer — natural first-person flow, confident yet conversational. Vary sentence length for authentic rhythm. Sound like you're sharing what you've internalized after studying the space for years.\n\n`;
    
    if (framingBias) prompt += `Framing Bias: ${framingBias}\n`;
    if (hookMechanics) prompt += `Hook Mechanics: ${hookMechanics}\n`;
    if (voiceDna) prompt += `${voiceDna}\n`;
    
    prompt += `\nNever do this:\n${antiPatterns}\n\n`;
    
    if (structuralArchetypes.length > 0) {
      prompt += `You usually structure your posts in one of these natural ways (pick whichever fits best):\n`;
      prompt += structuralArchetypes
        .map((arch: any) => `- ${arch.name}: ${arch.description}\n  Example: ${arch.example}`)
        .join('\n');
      prompt += '\n\n';
    }
    
    prompt += `Before you output, quickly check:\n`;
    if (validationChecklist.length > 0) {
      prompt += validationChecklist.map((item: any) => `- ${String(item)}`).join('\n');
    } else {
      prompt += `- Does this sound like something a real expert would actually post?
- The reader has NO IDEA about any source material — they only see your standalone insight
- Would a busy professional immediately recognize this as high-signal material with concrete facts, meaningful contrasts, and grounded opinion?
- Does this deliver full value without needing any link or context?
- Is there zero gyaan or generic advice — only facts, insights, and professional observation?`;
    }
    prompt += '\n\n';
    
    if (formatRules.length > 0) {
      prompt += `FORMAT RULES: ${formatRules.join(' | ')}\n\n`;
    }
    
    prompt += `Output ONLY valid JSON. Nothing else.\n\n{\n`;
    
    if (coreThesis || theEnemy) {
      prompt += `  "internal_monologue": "Your raw, unfiltered strategic analysis...",\n`;
    }
    prompt += `  "content": "The final text of the post to be published...",\n`;
    prompt += `  "selected_url": "The exact URL of the article you chose to react to (if any)"`;
    
    if (wantsImage) {
      prompt += `,\n  "cardData": {\n    "imagePrompt": "<short, vivid description for an image — max 200 characters>"\n  }`;
    }
    
    prompt += `\n}`;
    
    const maxLength = persona.max_length || 280;
    prompt += `\n\nEnsure the content is under ${maxLength} characters.`;
    
    return prompt;
  }
  
  private buildThreadPrompt(params: {
    persona: Persona;
    dataContext: string;
    identityContext: string;
    sourceLogic: string;
    voiceDna: string;
    antiPatterns: string;
    coreThesis: string;
    theEnemy: string;
    analyticalFramework: string;
    framingBias: string;
    hookMechanics: string;
    structuralArchetypes: any[];
    validationChecklist: any[];
    threadCount: number;
    threadTemplate?: string;
    formatRules: string[];
    usedSourceUrls?: string[];
  }): string {
    const {
      persona,
      dataContext,
      identityContext,
      sourceLogic,
      voiceDna,
      antiPatterns,
      coreThesis,
      theEnemy,
      analyticalFramework,
      structuralArchetypes,
      validationChecklist,
      threadCount,
      threadTemplate,
      formatRules,
      usedSourceUrls,
    } = params;
    
    const templateInstructions = threadTemplate 
      ? `\nTHREAD TEMPLATE: Use the "${threadTemplate}" structure for this thread.\n`
      : '';
    
    let prompt = `You are ${persona.name}. ${identityContext}\n\n${persona.description || ''}\n\n`;
    
    if (dataContext) {
      prompt += `Right now you have this fresh context from your sources:\n${dataContext}\n\n`;
      
      if (usedSourceUrls && usedSourceUrls.length > 0) {
        prompt += `Do not use these articles again:\n${usedSourceUrls.map(url => `- ${url}`).join('\n')}\n`;
      }
    }
    
    if (coreThesis || theEnemy || analyticalFramework) {
      prompt += `YOUR PSYCHOLOGICAL DNA:\n`;
      if (coreThesis) prompt += `- Core Thesis: ${coreThesis}\n`;
      if (theEnemy) prompt += `- The Enemy: ${theEnemy}\n`;
      if (analyticalFramework) prompt += `- Analytical Framework: ${analyticalFramework}\n`;
      prompt += '\n';
    }
    
    prompt += templateInstructions;
    
    prompt += `Follow these rules exactly:\n${sourceLogic}\n\n`;
    prompt += `Write exactly like a real, sharp industry observer — natural first-person flow, confident yet conversational.\n\n`;
    
    if (voiceDna) prompt += `${voiceDna}\n`;
    prompt += `\nNever do this:\n${antiPatterns}\n\n`;
    
    if (structuralArchetypes.length > 0) {
      prompt += `You usually structure your posts in one of these natural ways:\n`;
      prompt += structuralArchetypes
        .map((arch: any) => `- ${arch.name}: ${arch.description}`)
        .join('\n');
      prompt += '\n\n';
    }
    
    prompt += `Output format:\n`;
    prompt += `Return a JSON array of ${threadCount} sequential posts. Each post should:\n`;
    prompt += `- Deliver standalone high-signal value with facts, contrasts, and insights\n`;
    prompt += `- Be 120-280 characters each\n`;
    prompt += `- Follow a logical narrative arc across the thread\n`;
    prompt += `- NEVER reference any source material — write as your own synthesized understanding\n`;
    
    if (validationChecklist.length > 0) {
      prompt += `\nValidation checklist:\n`;
      prompt += validationChecklist.map((item: any) => `- ${String(item)}`).join('\n');
    }
    
    prompt += `\n\nOutput ONLY valid JSON array. Nothing else.\n`;
    prompt += `[\n  { "sequence": 1, "content": "..." },\n  { "sequence": 2, "content": "..." },\n  ...\n]`;
    
    return prompt;
  }
}

// Singleton instance
export const promptEngine = new PromptEngine();
export default promptEngine;