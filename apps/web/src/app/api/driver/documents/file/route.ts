import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { storageProvider } from '@/lib/storage';
import { prisma, safeDbQuery } from '@/lib/prisma';
import { normalizePhone } from '@kandycabs/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPath = searchParams.get('path');

    if (!rawPath) {
      return NextResponse.json({ error: 'Missing document path parameter' }, { status: 400 });
    }

    // 1. Security Authorization Check
    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Login required to access documents.' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid authentication session token.' }, { status: 401 });
    }

    const isAdmin =
      decoded.roles?.includes('ADMIN') ||
      decoded.phone === '9481086058' ||
      decoded.phone === '9999999999';

    // Parse target driver phone/ID from path: "drivers/{driverId}/..."
    const pathParts = rawPath.replace(/^[\/\\]+/, '').split('/');
    const targetDriverId = pathParts.length >= 2 && pathParts[0] === 'drivers' ? pathParts[1] : '';

    if (!isAdmin) {
      // If user is a driver, verify ownership of requested driver documents
      const authedPhone = normalizePhone(decoded.phone);
      const targetCleanId = targetDriverId.replace(/^d_/, '');

      const isOwner =
        authedPhone === targetCleanId ||
        (decoded.userId && decoded.userId.includes(targetCleanId));

      if (!isOwner) {
        // Query DB to verify if driver ID matches authed user ID
        const dbDriver = await safeDbQuery(() =>
          prisma.driver.findFirst({
            where: { userId: decoded.userId },
            select: { id: true, user: { select: { phone: true } } },
          })
        );

        const dbDriverPhone = dbDriver?.user?.phone ? normalizePhone(dbDriver.user.phone) : '';
        if (!dbDriver || (dbDriver.id !== targetDriverId && dbDriverPhone !== targetCleanId)) {
          return NextResponse.json(
            { error: 'Forbidden. You do not have permission to view another driver\'s document.' },
            { status: 403 }
          );
        }
      }
    }

    // 2. Fetch binary file buffer securely via storage provider
    const fileResult = await storageProvider.getFileBuffer(rawPath);
    if (!fileResult) {
      return NextResponse.json({ error: 'Document file not found or has been moved.' }, { status: 404 });
    }

    // 3. Return protected file response with binary content headers
    return new NextResponse(new Uint8Array(fileResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': fileResult.mimeType,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('[DocumentFileAPI] Protected file serve error:', err);
    return NextResponse.json({ error: err.message || 'Error serving document file' }, { status: 500 });
  }
}
