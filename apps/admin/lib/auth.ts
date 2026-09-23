import { NextRequest } from 'next/server';
import { verifyAuthToken, UserRole, AuthTokenPayload } from '@kandy-cabs/shared';

export async function getAdminSession(req: NextRequest): Promise<AuthTokenPayload | null> {
  let token = req.cookies.get('kandy_session')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.roles || !payload.roles.includes(UserRole.ADMIN)) {
    return null;
  }

  return payload;
}
