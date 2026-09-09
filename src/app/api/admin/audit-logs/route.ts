import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { getAuditLogs } from '@/lib/adminEngine';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const logs = getAuditLogs();
  return NextResponse.json({
    success: true,
    total: logs.length,
    data: logs,
  });
}
