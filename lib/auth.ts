import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

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
          const hashedPassword = createHash('sha256').update(password).digest('hex');
          const newUserResult = await sql`
            INSERT INTO users (id, name, email, hashed_password, created_at, updated_at)
            VALUES (gen_random_uuid(), ${email}, ${email}, ${hashedPassword}, NOW(), NOW())
            RETURNING id, name, email, image
          `;
          
          if (newUserResult.rows.length > 0) {
            return {
              id: newUserResult.rows[0].id,
              name: newUserResult.rows[0].name,
              email: newUserResult.rows[0].email,
              image: newUserResult.rows[0].image,
            };
          }
          return null;
        }

        const user = result.rows[0];
        const hashedPassword = createHash('sha256').update(password).digest('hex');

        if (user.hashedPassword !== hashedPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }
    })
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return (session.user as any).id || null;
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  
  const userId = (session.user as any).id;
  if (!userId) return null;

  const result = await sql`
    SELECT id, name, email, image
    FROM users 
    WHERE id = ${userId}
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