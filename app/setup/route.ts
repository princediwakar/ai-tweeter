import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams.toString();
  const dest = searchParams ? `/onboarding?${searchParams}` : '/onboarding';
  return NextResponse.redirect(new URL(dest, request.url));
}
