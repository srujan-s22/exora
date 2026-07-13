import { cookies } from 'next/headers';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  // Only authenticated users can trigger logout
  if (!token) {
    return errorResponse('UNAUTHORIZED', 'No active session to log out', 401);
  }

  // Clear HTTP-only authentication cookie
  cookieStore.delete(AUTH_COOKIE_NAME);

  return successResponse({ success: true });
}
