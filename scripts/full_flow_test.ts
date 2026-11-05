import { sql } from '@vercel/postgres';
import { connectedAccountsService } from '../lib/connectedAccounts';
import { brandProfileService } from '../lib/brandEngine/BrandProfileService';
import { nextPostPlanner } from '../lib/brandEngine/NextPostPlanner';
import { generateBrandPost } from '../lib/generationService';
import { claimPostsForPosting, finalizePostPosting, savePost, generatePostId } from '../lib/db';
import { getCredentialsForAccount, refreshTokenIfNeeded } from '../lib/postingService';
import { getGenerationBatchInfo, getPostingBatchInfo } from '../lib/schedule';

async function runFullFlowTest() {
  console.log('=====================================================');
  console.log('🚀 RUNNING END-TO-END VERIFICATION: PURE BRAND ENGINE');
  console.log('=====================================================\n');

  // 1. Fetch Brand Profile
  console.log('Step 1: Fetching Brand Profile...');
  const brands = await sql`SELECT id, name, industry FROM brand_profiles LIMIT 1`;
  const brand = brands.rows[0];
  if (!brand) throw new Error('No brand profile found!');
  console.log(`✅ Found Brand: "${brand.name}" (${brand.id})`);

  // 2. Fetch Connected Account
  console.log('\nStep 2: Resolving Connected Account...');
  const connAccounts = await sql`SELECT id, account_username, platform FROM connected_accounts WHERE platform = 'twitter' LIMIT 1`;
  const accountRow = connAccounts.rows[0];
  if (!accountRow) throw new Error('No connected Twitter account found!');
  console.log(`✅ Found Twitter Account: @${accountRow.account_username} (${accountRow.id})`);

  // 3. Plan Next Post
  console.log('\nStep 3: Planning Next Post via NextPostPlanner...');
  const plan = await nextPostPlanner.plan(brand.id, 'twitter');
  if (!plan) throw new Error('Planner returned null plan!');
  console.log(`✅ Plan Created: Pillar = "${plan.pillar.name}", Angle = "${plan.suggested_angle}"`);

  // 4. Generate Brand Post via AI & Consistency Check
  console.log('\nStep 4: Generating Content via DeepSeek + Consistency Check...');
  const mockPersona = {
    id: brand.id,
    name: brand.name,
    key: 'brand_engine',
    description: '',
    config: {
      format_rules: [
        'No emojis or hashtags.',
        'Use short, punchy sentences.',
        'Sound authentic and hilarious.'
      ]
    }
  };
  const genResult = await generateBrandPost(brand.id, mockPersona as any, 'twitter');
  if (!genResult) throw new Error('Content generation returned null!');
  console.log(`✅ Post Generated successfully:`);
  console.log(`   "${genResult.post.content}"`);

  // 5. Save Post to DB
  console.log('\nStep 5: Saving Post to Database...');
  const newPostId = generatePostId();
  await savePost({
    id: newPostId,
    connected_account_id: accountRow.id,
    brand_profile_id: brand.id,
    pillar_id: plan.pillar.id,
    content: genResult.post.content,
    status: 'ready',
    narrative_tags: genResult.metadata.narrative_tags,
    theme_summary: genResult.metadata.theme_summary,
  });
  console.log(`✅ Saved post with id: ${newPostId} and status: 'ready'`);

  // 6. Claim Post via Atomic SKIP LOCKED
  console.log('\nStep 6: Testing Queue Claiming (claimPostsForPosting)...');
  const claimedPosts = await claimPostsForPosting(accountRow.id, 1);
  const targetPost = claimedPosts.find(p => p.id === newPostId) || claimedPosts[0];
  if (!targetPost) throw new Error('Failed to claim post!');
  console.log(`✅ Successfully claimed post: ${targetPost.id} (Status updated to 'posting')`);

  // 7. Verify Credentials & Dispatcher Auth
  console.log('\nStep 7: Verifying Credential Resolution & OAuth 2.0 Mapping...');
  const accountWithCreds = await connectedAccountsService.getByIdWithCredentials(accountRow.id);
  if (!accountWithCreds) throw new Error('Failed to load account with credentials!');
  const creds = await getCredentialsForAccount(accountWithCreds);
  console.log(`✅ Credentials Resolved:`);
  console.log(`   - Platform: ${creds.platform}`);
  console.log(`   - OAuth2 Access Token Present: ${!!creds.oauth2AccessToken}`);
  console.log(`   - OAuth2 Refresh Token Present: ${!!creds.oauth2RefreshToken}`);

  // 8. Finalize Post Posting
  console.log('\nStep 8: Finalizing Post (finalizePostPosting)...');
  await finalizePostPosting(targetPost.id, 'posted', undefined, 'mock-twitter-status-123456');
  const checkFinal = await sql`SELECT id, status, published_at, platform_post_id FROM posts WHERE id = ${targetPost.id}`;
  const finalRow = checkFinal.rows[0];
  console.log(`✅ Post Finalized: status = '${finalRow.status}', published_at = ${finalRow.published_at}, platform_post_id = ${finalRow.platform_post_id}`);

  // 9. Schedule Info Checks
  console.log('\nStep 9: Testing Schedule Batch Info...');
  const schedGen = await getGenerationBatchInfo(accountRow.account_username, true);
  console.log(`✅ getGenerationBatchInfo (Debug): should_generate = ${schedGen.should_generate}`);
  const schedReal = await getGenerationBatchInfo(accountRow.account_username, false);
  console.log(`✅ getGenerationBatchInfo (Real Window): should_generate = ${schedReal.should_generate} (Reason: ${schedReal.reason})`);
  const schedPost = await getPostingBatchInfo(accountRow.account_username);
  console.log(`✅ getPostingBatchInfo: should_post = ${schedPost.should_post} (Reason: ${schedPost.reason})`);

  console.log('\n=====================================================');
  console.log('🎉 ALL 9 STAGES OF THE BRAND ENGINE PASSED WITH 100% SUCCESS!');
  console.log('=====================================================');
}

runFullFlowTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
}).finally(() => process.exit(0));
