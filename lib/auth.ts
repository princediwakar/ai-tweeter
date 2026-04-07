// lib/auth.ts
import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import TwitterProvider from 'next-auth/providers/twitter';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { platformSettings } from './platformSettings';

async function getOAuthProviders() {
  const providers = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    const twitterCreds = await platformSettings.getTwitterCredentials();
    if (twitterCreds.client_id && twitterCreds.client_secret) {
      const callbackUrl = `${baseUrl}/api/auth/callback/twitter`;
      providers.push(
        TwitterProvider({
          clientId: twitterCreds.client_id,
          clientSecret: twitterCreds.client_secret,
          version: '2.0',
          authorization: {
            url: 'https://twitter.com/i/oauth2/authorize',
            params: {
              scope: 'tweet.read users.read follows.read offline.access email',
            },
          },
          token: 'https://api.twitter.com/2/oauth2/token',
        })
      );
      console.log('[Auth] Twitter OAuth 2.0 configured, callback:', callbackUrl);
    }
  } catch (e) {
    console.warn('Twitter OAuth config error:', e);
  }

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
      
      if (account && profile) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.tokenExpires = account.expires_at;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return { ...session, user: undefined };
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).provider = token.provider;
        (session.user as any).providerAccountId = token.providerAccountId;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!account || !profile) {
        return true;
      }

      const email = user.email;
      const provider = account.provider;
      
      if (!email) {
        console.warn(`OAuth sign-in without email from ${provider}:`, user);
        return true;
      }

      try {
        let userResult = await sql`SELECT id FROM users WHERE email = ${email}`;
        let userId: string;

        if (userResult.rows.length === 0) {
          const newUser = await sql`
            INSERT INTO users (id, name, email, hashed_password, created_at, updated_at)
            VALUES (gen_random_uuid(), ${user.name || email}, ${email}, NULL, NOW(), NOW())
            RETURNING id
          `;
          userId = newUser.rows[0].id;
          console.log(`[OAuth] Created new user ${userId} for ${email} via ${provider}`);
        } else {
          userId = userResult.rows[0].id;
        }

        const platform = provider === 'twitter' ? 'twitter' : 'linkedin';
        const accountUsername = provider === 'twitter' 
          ? (profile as any)?.username || user.name
          : (profile as any)?.sub || user.name;
        const accountName = user.name || accountUsername;
        const platformUserId = account.providerAccountId;
        
        const tokenExpiresAt = account.expires_at 
          ? new Date(account.expires_at * 1000).toISOString()
          : null;

        // Use connectedAccountsService for proper encryption and schema
        const { connectedAccountsService } = await import('@/lib/connectedAccounts');
        
        await connectedAccountsService.upsert({
          user_id: userId,
          platform,
          account_username: accountUsername,
          name: accountName,
          platform_user_id: platformUserId,
          access_token: account.access_token || null,
          refresh_token: account.refresh_token || null,
          token_expires_at: tokenExpiresAt,
          is_active: true,
        });

        console.log(`[OAuth] Connected ${platform} account for user ${userId} via NextAuth`);
      } catch (error) {
        console.error('[OAuth] Failed to connect account:', error);
      }

      return true;
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