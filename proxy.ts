import { withAuth } from 'next-auth/middleware';

const authProxy = withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const proxy = authProxy;
export default authProxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|auth|privacy|terms|setup|api/auth|api/admin/migrate-saas|api/admin/cleanup|api/admin/migrate-posting-jobs|api/admin/migrate-onboarding|api/admin/migrate-tweet-metadata|api/auto-post|api/auto-post-linkedin|api/engage|api/generate|api/process-images).*)',
  ],
};
