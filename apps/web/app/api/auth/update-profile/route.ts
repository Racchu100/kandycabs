import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';
import { verifyAuthToken } from '@kandy-cabs/shared';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get('kandy_session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      const res = NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const payload = await verifyAuthToken(token);
    if (!payload || !payload.userId) {
      const res = NextResponse.json(
        { success: false, message: 'Invalid or expired session token' },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    const body = await req.json();
    const { fullName, email } = body;

    const updateData: any = {};
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      updateData.fullName = fullName.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      include: {
        customer: true,
        driver: true,
      },
    });

    if (email && typeof email === 'string' && updatedUser.customer) {
      await prisma.customer.update({
        where: { id: updatedUser.customer.id },
        data: { email: email.trim() },
      });
    }

    const userProfile = {
      id: updatedUser.id,
      phone: updatedUser.phone,
      fullName: updatedUser.fullName,
      email: email?.trim() || updatedUser.customer?.email || null,
      roles: updatedUser.roles,
      createdAt: updatedUser.createdAt,
    };

    const res = NextResponse.json(
      { success: true, user: userProfile },
      { status: 200 }
    );
    return setCorsHeaders(res);
  } catch (error: any) {
    console.error('Error in /api/auth/update-profile:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to update profile' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
