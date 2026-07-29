import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

export async function POST() {
  const cookieStore = await cookies();

  // Security Note: Unconditionally purge authentication cookie with explicit security flags
  // to ensure invalid/expired tokens are cleanly destroyed on client browsers.
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });

  return successResponse({ success: true, message: 'Logged out successfully' });
}
