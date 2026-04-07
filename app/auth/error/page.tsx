// app/auth/error/page.tsx
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;

  const errorMessages: Record<string, string> = {
    default: 'An unexpected error occurred during authentication.',
    configuration: 'There is a problem with the server configuration.',
    accessdenied: 'Access denied.',
    verification: 'The verification link may have expired or already been used.',
    credentials: 'Invalid email or password.',
  };

  const errorMessage = error && errorMessages[error] ? errorMessages[error] : errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Sign In
          </Link>
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}