import { NextResponse } from 'next/server';
import { testImagePosting, testSimpleTweet } from '@/lib/testImagePosting';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account_id, test_type = 'simple' } = body;
    
    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }
    
    console.log(`🧪 Starting ${test_type} test for account: ${account_id}`);
    
    const result = test_type === 'image' ? 
      await testImagePosting(account_id) : 
      await testSimpleTweet(account_id);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true,
        message: 'Image posted successfully!',
        tweetId: result.tweetId,
        tweetUrl: `https://twitter.com/i/web/status/${result.tweetId}`
      });
    } else {
      return NextResponse.json({ 
        success: false,
        error: result.error 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Test image posting API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}