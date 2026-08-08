import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { successResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { SessionService } from '@/lib/services/session.service';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.sid && decoded.sub) {
          const reqHeaders = await headers();
          const ipAddress = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || undefined;
          const userAgent = reqHeaders.get('user-agent') || undefined;

          await SessionService.revokeSession(
            decoded.sid,
            decoded.sub,
            'User logged out from device',
            ipAddress,
            userAgent
          );
        }
      }
    } catch {
      // Ignore token decode errors on logout, cookie will still be destroyed
    }
  }

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
