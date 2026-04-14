// lib/generation/PromptEngine.ts
// Unified prompt building - handles single tweets, threads, and batch generation
// Consolidates logic from generationProcessing.ts and databasePersona.ts

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
 * Unified PromptEngine - builds prompts for single tweets, threads, or batch
 * Uses persona DNA (identity_context, voice_dna, source_logic, etc.)
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
    const identityContext = String(pConfig.identity_context || pConfig.core_thesis || 'You are an AI content generator.');
    
    // Strong default for source_logic - emphasizes deep internalization and original synthesis
    const defaultSourceLogic = `BEFORE DECIDING WHAT TO POST:
Evaluate each article in the context (ARTICLE 1, 2, etc.):
- Is it TIMELY and contains fresh data or operational insight?
- Is it SUBSTANTIVE (contains measurable data, real examples, or mechanics worth analyzing)?
- Is it WORTH STANDING BEHIND as your own insight?

Only proceed if at least one article passes ALL THREE.
If none pass, return: {"content": "No suitable material today."}

YOUR JOB: Read and deeply internalize the provided context. Synthesize it with your own operational expertise. Then produce a post that feels like your own original, high-signal insight.

- The post must read as if you personally analyzed the situation and drew this conclusion.
- The reader must receive complete, standalone value — no need to click any link.
- Never mention any article, source, author, or external reference.
- Never say "this article", "according to", "I read", "key takeaway", or anything that implies external origin.
- Write as a seasoned expert sharing distilled, data-backed understanding from experience.
- The audience must feel they just received high-value, actionable material they can use immediately.`;

    const sourceLogic = String(pConfig.source_logic || defaultSourceLogic);
    const voiceDna = String(pConfig.voice_dna || pConfig.voice || 'Write in a clear, engaging voice.');
    const antiPatterns = String(pConfig.anti_patterns || 'Avoid generic filler words.');
    const coreThesis = String(pConfig.core_thesis || '');
    const theEnemy = String(pConfig.the_enemy || '');
    const analyticalFramework = String(pConfig.analytical_framework || '');
    const framingBias = String(pConfig.framing_bias || '');
    const hookMechanics = String(pConfig.hook_mechanics || '');
    
    // Structural archetypes
    const rawArchetypes = pConfig.structural_archetypes;
    const structuralArchetypes = Array.isArray(rawArchetypes) ? rawArchetypes : [];
    
    // Validation checklist
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
        userTopicContext: options.userTopicContext,
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
  
  /**
   * Build single tweet prompt
   */
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
    userTopicContext?: string;
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
      userTopicContext,
      previousHeadlines,
      usedSourceUrls,
    } = params;
    
    let prompt = `You are ${persona.name}. ${identityContext}\n\n${persona.description || ''}\n\n`;
    
    // Add topic-based generation context
    if (topic && userTopicContext) {
      prompt += `USER REQUEST: Write a post about "${topic}"\n\nHere's some context from recent news about this topic:\n${userTopicContext}\n\n`;
    } else if (topic) {
      prompt += `USER REQUEST: Write a post about "${topic}"\n\n`;
    } else if (dataContext) {
      // RSS-based context
      prompt += `Right now you have this fresh context from your sources:\n${dataContext}\n\n`;
      
      if (previousHeadlines && previousHeadlines.length > 0) {
        prompt += `You've already used these headlines: ${previousHeadlines.join(', ')}. Pick something new.\n`;
      }
      
      if (usedSourceUrls && usedSourceUrls.length > 0) {
        prompt += `Do not use these articles again:\n${usedSourceUrls.map(url => `- ${url}`).join('\n')}\n`;
      }
    } else {
      prompt += `No specific news provided. Draw on your general industry knowledge and operational expertise.\n\n`;
    }
    
    // Add psychological DNA if available
    if (coreThesis || theEnemy || analyticalFramework) {
      prompt += `YOUR PSYCHOLOGICAL DNA:\n`;
      if (coreThesis) prompt += `- Core Thesis: ${coreThesis}\n`;
      if (theEnemy) prompt += `- The Enemy: ${theEnemy}\n`;
      if (analyticalFramework) prompt += `- Analytical Framework: ${analyticalFramework}\n`;
      prompt += '\n';
    }
    
    prompt += `Follow these rules exactly:\n${sourceLogic}\n\n`;
    
    prompt += `Write exactly like a real, experienced professional would — natural rhythm, first person, precise yet conversational. Mix short punchy sentences with slightly longer explanatory ones. Use contractions. Sound like you are sharing hard-won insight with a sharp colleague.\n\n`;
    
    if (framingBias) prompt += `Framing Bias: ${framingBias}\n`;
    if (hookMechanics) prompt += `Hook Mechanics: ${hookMechanics}\n`;
    if (voiceDna) prompt += `${voiceDna}\n`;
    
    prompt += `\nNever do this:\n${antiPatterns}\n\n`;
    
    if (structuralArchetypes.length > 0) {
      prompt += `You usually structure your posts in one of these natural ways (pick whichever fits the insight best — don't force it):\n`;
      prompt += structuralArchetypes
        .map((arch: any) => `- ${arch.name}: ${arch.description}\n  Example: ${arch.example}`)
        .join('\n');
      prompt += '\n\n';
    }
    
    prompt += `Before you output, quickly check:\n`;
    if (validationChecklist.length > 0) {
      prompt += validationChecklist.map((item: any) => `- ${String(item)}`).join('\n');
    } else {
      prompt += `- Does this sound like something a real expert with deep experience would actually post?
- READER HAS NO IDEA ABOUT ANY LINK OR SOURCE - they only see your original insight
- Would this post make complete sense and deliver full value if there was NO link attached?
- Would someone follow you based on this post alone because of its substance and clarity?
- Does this post contain high-signal, data-backed material that provides immediate value?`;
    }
    prompt += '\n\n';
    
    // Format rules
    if (formatRules.length > 0) {
      prompt += `FORMAT RULES: ${formatRules.join(' | ')}\n\n`;
    }
    
    // Output schema
    prompt += `Output ONLY valid JSON. Nothing else.\n\n{\n`;
    
    if (coreThesis || theEnemy) {
      prompt += `  "internal_monologue": "Your raw, unfiltered strategic analysis and synthesis of the material...",\n`;
    }
    prompt += `  "content": "The final text of the post to be published...",\n`;
    prompt += `  "selected_url": "The exact URL of the article you chose to internalize and synthesize (if any)"`;
    
    if (wantsImage) {
      prompt += `,\n  "cardData": {\n    "imagePrompt": "<short, vivid description for an image — max 200 characters>"\n  }`;
    }
    
    prompt += `\n}`;
    
    // Add character limit
    const maxLength = persona.max_length || 280;
    prompt += `\n\nEnsure the content is under ${maxLength} characters.`;
    
    return prompt;
  }
  
  /**
   * Build thread prompt
   */
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
    prompt += `Write exactly like a real, experienced professional would — natural rhythm, first person, precise yet conversational.\n\n`;
    
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
    prompt += `Return a JSON array of ${threadCount} sequential tweets. Each tweet should:\n`;
    prompt += `- Be a completely standalone post that makes sense WITHOUT any link context\n`;
    prompt += `- Deliver full value to the reader without requiring them to click anything\n`;
    prompt += `- Be 100-280 characters each\n`;
    prompt += `- Follow a logical narrative arc across the thread while remaining high-signal\n`;
    prompt += `- NEVER reference any article, source, author, or external material - write entirely as your own synthesized insight\n`;
    
    if (validationChecklist.length > 0) {
      prompt += `\nValidation checklist:\n`;
      prompt += validationChecklist.map((item: any) => `- ${String(item)}`).join('\n');
    }
    
    prompt += `\n\nOutput ONLY valid JSON array. Nothing else.\n`;
    prompt += `[\n  { "sequence": 1, "content": "...", "hashtags": ["..."] },\n  { "sequence": 2, "content": "...", "hashtags": ["..."] },\n  ...\n]`;
    
    return prompt;
  }
}

// Singleton instance
export const promptEngine = new PromptEngine();
export default promptEngine;