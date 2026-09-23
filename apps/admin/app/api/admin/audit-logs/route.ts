import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@kandy-cabs/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const search = searchParams.get('search')?.trim();

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (action && action !== 'ALL') {
      whereClause.action = action;
    }
    if (entityType && entityType !== 'ALL') {
      whereClause.entityType = entityType;
    }
    if (search) {
      whereClause.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { actorUser: { fullName: { contains: search, mode: 'insensitive' } } },
        { actorUser: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: {
              fullName: true,
              phone: true,
              roles: true,
            },
          },
        },
      }),
    ]);

    const formatted = logs.map((l) => ({
      id: l.id,
      actorUserId: l.actorUserId,
      actorName: l.actorUser?.fullName || (l.actorUserId ? 'Admin User' : 'System / Webhook'),
      actorPhone: l.actorUser?.phone || '',
      actorRole: l.actorUser?.roles?.[0] || 'SYSTEM',
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      reason: l.reason,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      logs: formatted,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/audit-logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
