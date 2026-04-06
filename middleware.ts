import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|auth|api/accounts|api/admin/migrate-saas|api/admin/cleanup|api/admin/migrate-posting-jobs|api/admin/migrate-onboarding|api/auto-post|api/auto-post-linkedin|api/engage|api/generate|api/process-images).*)',
  ],
};