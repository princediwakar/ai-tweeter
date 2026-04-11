// lib/auth.ts
import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import LinkedInProvider from 'next-auth/providers/linkedin';
import TwitterProvider from 'next-auth/providers/twitter';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { platformSettings } from './platformSettings';

async function getOAuthProviders() {
  const providers = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Twitter/X OAuth
  try {
    const twitterCreds = await platformSettings.getTwitterCredentials();
    if (twitterCreds.client_id && twitterCreds.client_secret) {
      const callbackUrl = `${baseUrl}/api/auth/callback/twitter`;
      providers.push(
        TwitterProvider({
          clientId: twitterCreds.client_id,
          clientSecret: twitterCreds.client_secret,
        })
      );
      console.log('[Auth] Twitter OAuth configured, callback:', callbackUrl);
    }
  } catch (e) {
    console.warn('Twitter OAuth config error:', e);
  }

  // LinkedIn OAuth
  try {
    const linkedinCreds = await platformSettings.getLinkedInCredentials();
    if (linkedinCreds.client_id && linkedinCreds.client_secret) {
      const callbackUrl = `${baseUrl}/api/auth/callback/linkedin`;
      providers.push(
        LinkedInProvider({
          clientId: linkedinCreds.client_id,
          clientSecret: linkedinCreds.client_secret,
          wellKnown: 'https://www.linkedin.com/oauth/.well-known/openid-configuration',
          authorization: { 
            params: { 
              scope: 'openid profile email w_member_social' 
            } 
          },
          profileUrl: 'https://api.linkedin.com/v2/userinfo',
          async profile(profile) {
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            };
          },
        })
      );
      console.log('[Auth] LinkedIn OAuth configured, callback:', callbackUrl);
    }
  } catch (e) {
    console.warn('LinkedIn OAuth config error:', e);
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { email, password } = credentials;

        try {
          const result = await sql`
            SELECT id, name, email, image, hashed_password as "hashedPassword"
            FROM users
            WHERE email = ${email}
          `;

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          const isValid = await bcrypt.compare(password, user.hashedPassword);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (error) {
          console.error('Database error in authorize:', error);
          return null;
        }
      }
    }),
    ...(await getOAuthProviders()),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
// Replace the callbacks section in lib/auth.ts
callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      } else if (token.email && !token.id) {
        try {
          const result = await sql`SELECT id FROM users WHERE email = ${token.email} LIMIT 1`;
          if (result.rows.length > 0) {
            token.id = result.rows[0].id;
          }
        } catch (error) {
          console.error("Failed to sync JWT with DB:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return { ...session, user: undefined };
      
      if (session.user) {
        const ext = session.user as Record<string, unknown>;
        ext.id = token.id;
      }
      return session;
    },
async signIn({ user, account, profile }) {
      if (!user.email) {
        console.error('[Auth] Sign in rejected: No email provided.');
        return '/auth/signup?error=no_email';
      }

      try {
        // 1. Establish Identity (Strictly by Email)
        let userId: string;
        const userResult = await sql`SELECT id FROM users WHERE email = ${user.email} LIMIT 1`;

        if (userResult.rows.length === 0) {
          const newUser = await sql`
            INSERT INTO users (id, name, email, hashed_password, created_at, updated_at)
            VALUES (gen_random_uuid(), ${user.name || user.email}, ${user.email}, NULL, NOW(), NOW())
            RETURNING id
          `;
          userId = newUser.rows[0].id;
        } else {
          userId = userResult.rows[0].id;
        }

// 2. The "Magic" Bridge: Auto-provision the node if they used OAuth
        if (account && (account.provider === 'linkedin' || account.provider === 'twitter')) {
          const { connectedAccountsService } = await import('@/lib/connectedAccounts');
          const platformUserId = account.providerAccountId;
          const provider = account.provider as 'linkedin' | 'twitter';
          
          const tokenExpiresAt = account.expires_at 
            ? new Date(account.expires_at * 1000).toISOString()
            : undefined;

          // Check if account already exists for this user
          const existingAccount = await sql`
            SELECT id FROM connected_accounts 
            WHERE user_id = ${userId} AND platform = ${provider}
          `;

          if (existingAccount.rows.length > 0 && account.access_token) {
            // Account exists - update token using existing ID to avoid FK constraint
            await connectedAccountsService.updateToken(
              existingAccount.rows[0].id,
              account.access_token,
              account.refresh_token || null,
              tokenExpiresAt || new Date(Date.now() + 3600000).toISOString(),
              'oauth2'
            );
            console.log(`[Auth] Magic UX: Updated token for existing ${provider} account ${existingAccount.rows[0].id} for user ${userId}`);
          } else {
            // New account - create it
            await connectedAccountsService.upsert({
              user_id: userId,
              platform: provider,
              account_username: platformUserId,
              name: user.name || '',
              platform_user_id: platformUserId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              token_expires_at: tokenExpiresAt,
            });
            console.log(`[Auth] Magic UX: Auto-provisioned ${provider} node for user ${userId}`);
          }
        }

        return true;
      } catch (error) {
        console.error('[Auth] Failed to verify/create user or provision node:', error);
        return false;
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }
  
  // ALWAYS look up user by email to ensure we have the fresh DB UUID, 
  // preventing issues when JWT tokens hold stale IDs after DB resets or migrations
  try {
    const result = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    return result.rows[0]?.id || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }
  
  const result = await sql`
    SELECT id, name, email, image
    FROM users 
    WHERE email = ${session.user.email}
    LIMIT 1
  `;

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
}