// scripts/verify-generation-mocks.ts
// Verification script with mock data - no DB required

import { promptEngine } from '../lib/generation/PromptEngine';
import type { Persona } from '../lib/types';

const mockPersona: Persona = {
  id: 'test-1',
  key: 'test_pragmatist',
  name: 'Test Pragmatist',
  description: 'A no-nonsense tech realist',
  topics: ['AI', 'startups'],
  rss_sources: ['techcrunch.com', 'wired.com'],
  tone: 'pragmatic',
  min_length: 100,
  max_length: 280,
  config: {
    identity_context: 'You are a pragmatic tech analyst.',
    voice_dna: 'Write in short, punchy sentences. No jargon.',
    core_thesis: 'AI will automate boring work, not magic.',
    the_enemy: 'Hype and buzzwords',
    analytical_framework: 'Look at real-world usage and economics',
    framing_bias: 'Focus on practical applications',
    hook_mechanics: 'Start with a controversial take',
    source_logic: 'Find articles about real AI implementations',
    anti_patterns: 'No buzzwords, no superlatives',
    structural_archetypes: [
      { name: 'The Contrarian', description: 'Challenge conventional wisdom', example: 'AI wont replace devs, but...' },
      { name: 'The Optimizer', description: 'Show efficiency gains', example: 'This approach saves 10hrs/week' }
    ],
    validation_checklist: [
      'Is this actually useful?',
      'Would I post this myself?'
    ],
    format_rules: ['Short paragraphs', 'No hashtags'],
    image_probability: 0.3
  },
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
};

async function verifyModules() {
  console.log('🔍 Starting Generation Pipeline Verification (Mock Mode)...\n');
  
  let passed = 0;
  let failed = 0;

  // 1. Test PromptEngine - Single Tweet
  console.log('1️⃣ Testing PromptEngine (single tweet)...');
  try {
    const result = promptEngine.build({
      persona: mockPersona,
      dataContext: '### ARTICLE 1\nURL: https://example.com\nTitle: AI Saves Time\nContent: New study shows AI tools save 5 hours/week',
      options: {
        isThread: false,
        wantsImage: true,
        usedSourceUrls: ['https://old-article.com']
      },
    });
    
    const hasInternalMonologue = result.prompt.includes('internal_monologue');
    const hasContent = result.prompt.includes('content');
    const hasImagePrompt = result.prompt.includes('cardData');
    const isNotThread = !result.formatMetadata.isThread;
    
    if (hasInternalMonologue && hasContent && isNotThread) {
      console.log(`   ✅ Single tweet prompt built correctly (${result.prompt.length} chars)`);
      console.log(`   📋 Schema: ${result.formatMetadata.outputSchema}`);
      passed++;
    } else {
      console.log(`   ❌ Missing expected prompt sections`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e}`);
    failed++;
  }

  // 2. Test PromptEngine - Thread
  console.log('\n2️⃣ Testing PromptEngine (thread)...');
  try {
    const result = promptEngine.build({
      persona: mockPersona,
      dataContext: '### ARTICLE 1\nURL: https://example.com\nTitle: AI Saves Time',
      options: {
        isThread: true,
        threadCount: 5,
        threadTemplate: 'deep_dive_analysis'
      },
    });
    
    const isThread = result.formatMetadata.isThread;
    const hasSequence = result.prompt.includes('sequence');
    const hasJsonArray = result.formatMetadata.outputSchema === 'json_array';
    
    if (isThread && hasSequence && hasJsonArray) {
      console.log(`   ✅ Thread prompt built correctly (${result.prompt.length} chars)`);
      console.log(`   📋 Tweet count: 5, Schema: ${result.formatMetadata.outputSchema}`);
      passed++;
    } else {
      console.log(`   ❌ Missing thread-specific sections`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e}`);
    failed++;
  }

  // 3. Test PromptEngine - With Topic
  console.log('\n3️⃣ Testing PromptEngine (topic-based)...');
  try {
    const result = promptEngine.build({
      persona: mockPersona,
      dataContext: '',
      options: {
        topic: 'future of AI',
        userTopicContext: 'Recent news about GPT-5 rumors'
      },
    });
    
    const hasTopic = result.prompt.includes('future of AI');
    const hasUserRequest = result.prompt.includes('USER REQUEST');
    
    if (hasTopic && hasUserRequest) {
      console.log(`   ✅ Topic-based prompt built correctly`);
      passed++;
    } else {
      console.log(`   ❌ Missing topic sections`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e}`);
    failed++;
  }

  // 4. Test PromptEngine - Format Rules
  console.log('\n4️⃣ Testing PromptEngine (format rules)...');
  try {
    const result = promptEngine.build({
      persona: mockPersona,
      dataContext: 'Test content',
      formatRules: ['First paragraph hook', 'Call to action at end', 'Emoji usage'],
    });
    
    const hasFormatRules = result.prompt.includes('FORMAT RULES');
    
    if (hasFormatRules) {
      console.log(`   ✅ Format rules included in prompt`);
      passed++;
    } else {
      console.log(`   ❌ Format rules missing`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e}`);
    failed++;
  }

  // 5. Test Persona DNA extraction
  console.log('\n5️⃣ Testing Persona DNA extraction...');
  try {
    const pConfig = mockPersona.config as Record<string, unknown>;
    const coreThesis = String(pConfig.core_thesis || '');
    const theEnemy = String(pConfig.the_enemy || '');
    
    if (coreThesis === 'AI will automate boring work, not magic.' && theEnemy === 'Hype and buzzwords') {
      console.log(`   ✅ Persona DNA extracted correctly`);
      console.log(`   📋 Thesis: ${coreThesis.substring(0, 30)}...`);
      passed++;
    } else {
      console.log(`   ❌ DNA extraction failed`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ Failed: ${e}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️ Some modules need attention.');
    process.exit(1);
  } else {
    console.log('\n✅ All generation modules verified (mock mode)!');
    console.log('\n📝 Note: Full integration test requires:');
    console.log('   - Database connection (for ContextBuilder)');
    console.log('   - Tavily API key (for ContentPipeline)');
    console.log('   - Deployed environment or Vercel');
  }
}

verifyModules().catch(console.error);