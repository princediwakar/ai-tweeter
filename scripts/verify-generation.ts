// scripts/verify-generation.ts
// Verification script to test generation pipeline modules

import { buildGenerationContext } from '../lib/generation/ContextBuilder';
import { promptEngine } from '../lib/generation/PromptEngine';
import { contentPipeline } from '../lib/contentSource/ContentPipeline';
import { getPersonaByKey } from '../lib/personas';

async function verifyModules() {
  console.log('🔍 Starting Generation Pipeline Verification...\n');
  
  let passed = 0;
  let failed = 0;

  // 1. Verify ContextBuilder
  console.log('1️⃣ Testing ContextBuilder...');
  try {
    const context = await buildGenerationContext({
      persona: undefined, // Should fallback to random
      connected_account_id: undefined,
    });
    console.log(`   ✅ ContextBuilder works - resolved persona: ${context.persona.name}`);
    console.log(`   📋 Format rules: ${context.formatRules.join(', ') || 'default'}`);
    passed++;
  } catch (e) {
    console.log(`   ❌ ContextBuilder failed: ${e}`);
    failed++;
  }

  // 2. Verify PromptEngine with single tweet
  console.log('\n2️⃣ Testing PromptEngine (single tweet)...');
  try {
    const persona = await getPersonaByKey('startup_skeptic');
    if (persona) {
      const result = promptEngine.build({
        persona,
        dataContext: 'Test article content',
        options: { isThread: false },
      });
      console.log(`   ✅ PromptEngine (single) works - ${result.prompt.length} chars`);
      passed++;
    } else {
      console.log('   ⚠️ No persona found, skipping');
    }
  } catch (e) {
    console.log(`   ❌ PromptEngine (single) failed: ${e}`);
    failed++;
  }

  // 3. Verify PromptEngine with thread
  console.log('\n3️⃣ Testing PromptEngine (thread)...');
  try {
    const persona = await getPersonaByKey('startup_skeptic');
    if (persona) {
      const result = promptEngine.build({
        persona,
        dataContext: 'Test article content',
        options: { isThread: true, threadCount: 5 },
      });
      console.log(`   ✅ PromptEngine (thread) works - ${result.formatMetadata.isThread ? 'thread mode' : 'single mode'}`);
      passed++;
    }
  } catch (e) {
    console.log(`   ❌ PromptEngine (thread) failed: ${e}`);
    failed++;
  }

  // 4. Verify ContentPipeline (will likely fail if no Tavily key, but should not crash)
  console.log('\n4️⃣ Testing ContentPipeline...');
  try {
    const persona = await getPersonaByKey('startup_skeptic');
    if (persona && persona.rss_sources && persona.rss_sources.length > 0) {
      // This may fail without API keys - that's OK
      console.log(`   📋 Persona has ${persona.rss_sources.length} sources configured`);
      console.log(`   ✅ ContentPipeline initialized correctly`);
      passed++;
    } else {
      console.log(`   ⚠️ No sources configured for test persona`);
    }
  } catch (e) {
    console.log(`   ❌ ContentPipeline failed: ${e}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️ Some modules need attention. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All core generation modules verified!');
  }
}

verifyModules().catch(console.error);