import { getAccount } from './db';
import { TwitterApi } from 'twitter-api-v2';

// Simple test image generation using SVG
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateTestVocabCardSVG(): string {
  const width = 1200;
  const height = 675;
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#f0f9ff"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="100%" height="100" fill="#0369a1"/>
      <text x="60" y="65" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">
        📚 gibbi.ai - Test Card
      </text>
      
      <!-- Main word -->
      <text x="60" y="200" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#0369a1">
        SERENDIPITY
      </text>
      
      <!-- Part of speech -->
      <rect x="60" y="220" width="120" height="30" rx="15" fill="#38bdf8" opacity="0.3"/>
      <text x="120" y="240" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0369a1" text-anchor="middle">
        noun
      </text>
      
      <!-- Definition -->
      <text x="60" y="300" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#0369a1">
        Definition:
      </text>
      <text x="60" y="340" font-family="Arial, sans-serif" font-size="24" fill="#075985">
        The pleasant surprise of finding something good unexpectedly
      </text>
      
      <!-- Example -->
      <text x="60" y="420" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#0369a1">
        Example:
      </text>
      <text x="60" y="460" font-family="Arial, sans-serif" font-size="22" fill="#075985" font-style="italic">
        "Finding this book was pure serendipity!"
      </text>
      
      <!-- Synonyms -->
      <text x="60" y="540" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0369a1">
        Synonyms: <tspan font-weight="normal">chance, luck, fortune</tspan>
      </text>
      
      <!-- Footer -->
      <text x="60" y="620" font-family="Arial, sans-serif" font-size="18" fill="#075985">
        🌟 Master English vocabulary at gibbi.vercel.app
      </text>
    </svg>
  `;
}

// Create a simple base64-encoded PNG for testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createTestPNGBuffer(): Buffer {
  // Simple 1x1 pixel PNG for testing (base64 encoded)
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return Buffer.from(base64PNG, 'base64');
}

// Test simple text tweet first
export async function testSimpleTweet(accountId: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    console.log(`🧪 Testing simple tweet for account: ${accountId}`);
    
    // Get account details
    const account = await getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    console.log(`📱 Using Twitter account: ${account.twitter_handle}`);
    
    // Create Twitter client
    const client = new TwitterApi({
      appKey: account.twitter_api_key,
      appSecret: account.twitter_api_secret,
      accessToken: account.twitter_access_token,
      accessSecret: account.twitter_access_token_secret,
    });
    
    // Post simple text tweet
    const tweetText = `🧪 API Connection Test - ${new Date().toISOString()}\n\n#Test #API`;
    
    console.log('🐦 Posting simple tweet...');
    const tweet = await client.v2.tweet(tweetText);
    
    console.log(`🎉 Tweet posted successfully! Tweet ID: ${tweet.data.id}`);
    
    return {
      success: true,
      tweetId: tweet.data.id
    };
    
  } catch (error) {
    console.error('❌ Simple tweet test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function testImagePosting(accountId: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    console.log(`🧪 Testing image posting for account: ${accountId}`);
    
    // Get account details
    const account = await getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    console.log(`📱 Using Twitter account: ${account.twitter_handle}`);
    
    // Create Twitter client
    const client = new TwitterApi({
      appKey: account.twitter_api_key,
      appSecret: account.twitter_api_secret,
      accessToken: account.twitter_access_token,
      accessSecret: account.twitter_access_token_secret,
    });
    
    // Load the actual test image
    const fs = await import('fs');
    const path = await import('path');
    const imagePath = path.join(process.cwd(), 'lib', 'test-image.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    
    console.log(`📸 Generated test image (${imageBuffer.length} bytes)`);
    
    // Upload image to Twitter
    console.log('📤 Uploading image to Twitter...');
    const mediaUpload = await client.v1.uploadMedia(imageBuffer, { 
      mimeType: 'image/jpeg',
      target: 'tweet' 
    });
    
    console.log(`✅ Image uploaded successfully. Media ID: ${mediaUpload}`);
    
    console.log('🐦 Posting tweet with image and minimal text...');
    // Post image with minimal text (just hashtags)
    const tweet = await client.v2.tweet({
      text: "#EnglishVocabulary #LearnEnglish",
      media: { media_ids: [mediaUpload.toString()] }
    });
    
    console.log(`🎉 Tweet posted successfully! Tweet ID: ${tweet.data.id}`);
    
    return {
      success: true,
      tweetId: tweet.data.id
    };
    
  } catch (error) {
    console.error('❌ Image posting test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}