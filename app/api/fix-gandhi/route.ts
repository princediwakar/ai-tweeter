// Temporary endpoint to fix Gandhi account encryption
import { NextResponse } from 'next/server';
import { accountService } from '@/lib/accountService';

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    // Simple auth check
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GANDHI_TWITTER_API_KEY;
    const apiSecret = process.env.GANDHI_TWITTER_API_SECRET;
    const accessToken = process.env.GANDHI_TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.GANDHI_TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return NextResponse.json({ error: 'Missing Gandhi credentials' }, { status: 400 });
    }

    // Update the account with properly encrypted credentials
    const updated = await accountService.updateAccount('165f7f23-a315-4285-919e-be16951494ba', {
      twitter_api_key: apiKey,
      twitter_api_secret: apiSecret,
      twitter_access_token: accessToken,
      twitter_access_token_secret: accessSecret
    });

    return NextResponse.json({
      success: true,
      message: 'Gandhi account encryption fixed',
      account: {
        id: updated.id,
        twitter_handle: updated.twitter_handle
      }
    });

  } catch (error) {
    console.error('Error fixing Gandhi encryption:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
