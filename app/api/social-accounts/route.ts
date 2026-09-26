import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    // Fetch all connected accounts
    const accounts = await connectedAccountsService.getByUserId(userId);
    
    const result = {
      twitter: [] as any[],
      linkedin: [] as any[],
    };

    for (const account of accounts) {
      if (account.platform === 'twitter') {
        result.twitter.push({
          id: account.id, // Connected account ID
          platform_user_id: account.platform_user_id,
          username: account.account_username,
          name: account.name
        });
      } else if (account.platform === 'linkedin') {
        // Add personal profile
        result.linkedin.push({
          id: account.id,
          platform_user_id: account.platform_user_id, // Personal URN
          username: account.account_username,
          name: account.name || 'Personal Profile',
          type: 'profile'
        });

        // Attempt to fetch company pages using access token
        try {
          const accountWithCreds = await connectedAccountsService.getWithCredentials(account.id);
          const oauth2Cred = accountWithCreds?.credentials?.find(c => c.auth_type === 'oauth2' && c.is_active);
          if (oauth2Cred && oauth2Cred.access_token) {
            const pagesResponse = await fetch('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&state=APPROVED', {
              headers: {
                'Authorization': `Bearer ${oauth2Cred.access_token}`,
                'X-Restli-Protocol-Version': '2.0.0',
              }
            });

            if (pagesResponse.ok) {
              const pagesData = await pagesResponse.json();
              if (pagesData.elements && pagesData.elements.length > 0) {
                // Fetch details for each organization to get the names
                const orgUrns = pagesData.elements.map((el: any) => el.organization).join(',');
                // For simplicity, we just list the URNs if we can't easily fetch names without another endpoint
                for (const el of pagesData.elements) {
                  result.linkedin.push({
                    id: account.id,
                    platform_user_id: el.organization, // Company URN
                    username: el.organization.replace('urn:li:organization:', ''),
                    name: `Company Page (${el.organization.replace('urn:li:organization:', '')})`,
                    type: 'page'
                  });
                }
              }
            }
          }
        } catch (e) {
          logger.error('Failed to fetch LinkedIn pages for account ' + account.id, 'api-social-accounts-get', e as Error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      accounts: result
    });
  } catch (error) {
    logger.error('Failed to fetch social accounts', 'api-social-accounts-get', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
