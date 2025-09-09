import { generateVocabularyCardImage, extractVocabularyCard, VocabularyCard } from './imageGenerationService';
import { getAccount } from './db';
import { postTweetWithImage } from './twitter';

export async function testVocabularyImageGeneration(): Promise<{ success: boolean; error?: string; imageGenerated?: boolean; tweetId?: string }> {
  try {
    console.log('🧪 Testing vocabulary image generation system...');

    // Test vocabulary card data
    const testCard: VocabularyCard = {
      word: 'serendipity',
      meaning: 'The pleasant surprise of finding something good unexpectedly',
      example: 'Finding this book was pure serendipity!',
      partOfSpeech: 'noun',
      synonyms: ['chance', 'luck', 'fortune']
    };

    console.log('🖼️ Generating vocabulary card image...');
    const imageBuffer = await generateVocabularyCardImage(testCard);
    
    console.log(`✅ Image generated successfully! Size: ${imageBuffer.length} bytes`);

    // Test content extraction
    const testContent = `📚 Word of the Day: "Serendipity" means the pleasant surprise of finding something good unexpectedly.

Example: "Finding this book was pure serendipity!"

Synonyms: chance, luck, fortune

#EnglishLearning #Vocabulary`;

    console.log('🔍 Testing content extraction...');
    const extractedCard = extractVocabularyCard(testContent);
    console.log('📝 Extracted card:', extractedCard);

    return {
      success: true,
      imageGenerated: true
    };

  } catch (error) {
    console.error('❌ Vocabulary image generation test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function testFullVocabularyImagePosting(accountId: string): Promise<{ success: boolean; error?: string; tweetId?: string }> {
  try {
    console.log(`🧪 Testing full vocabulary image posting for account: ${accountId}`);
    
    // Get account details
    const account = await getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    console.log(`📱 Using Twitter account: ${account.twitter_handle}`);

    // Test vocabulary card data
    const testCard: VocabularyCard = {
      word: 'ubiquitous',
      meaning: 'Present, appearing, or found everywhere',
      example: 'Smartphones are ubiquitous in modern society',
      partOfSpeech: 'adjective',
      synonyms: ['widespread', 'pervasive', 'omnipresent']
    };

    console.log('🖼️ Generating vocabulary card image...');
    const imageBuffer = await generateVocabularyCardImage(testCard);
    
    console.log(`✅ Image generated! Size: ${imageBuffer.length} bytes`);

    // Create Twitter credentials
    const twitterCredentials = {
      apiKey: account.twitter_api_key,
      apiSecret: account.twitter_api_secret,
      accessToken: account.twitter_access_token,
      accessSecret: account.twitter_access_token_secret,
    };

    // Post tweet with image
    const tweetContent = '#VocabularyBuilder #EnglishLearning';
    
    console.log('🐦 Posting vocabulary card image...');
    const result = await postTweetWithImage(tweetContent, imageBuffer, twitterCredentials);
    
    console.log(`🎉 Vocabulary image posted successfully! Tweet ID: ${result.data.id}`);
    console.log(`🔗 URL: https://x.com/${account.twitter_handle}/status/${result.data.id}`);

    return {
      success: true,
      tweetId: result.data.id
    };

  } catch (error) {
    console.error('❌ Full vocabulary image posting test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}