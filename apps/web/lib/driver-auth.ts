import { NextRequest } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { verifyAuthToken, UserRole } from '@kandy-cabs/shared';

export interface DriverSession {
  userId: string;
  driverId: string;
  driver: any;
  user: any;
}

export async function getDriverSession(req: NextRequest): Promise<DriverSession | null> {
  let token = req.cookies.get('kandy_session')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId, deletedAt: null },
    include: {
      driver: {
        include: {
          vehicles: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!user || !user.driver || user.driver.deletedAt) {
    return null;
  }

  return {
    userId: user.id,
    driverId: user.driver.id,
    driver: user.driver,
    user,
  };
}
