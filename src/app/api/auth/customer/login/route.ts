import { NextResponse } from 'next/server';
import { verifyCustomerCredentials } from '@/lib/customerAccountEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Mobile / Username and Password are required' }, { status: 400 });
    }

    const result = verifyCustomerCredentials(identifier, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch {
    return NextResponse.json({ error: 'Password login failed' }, { status: 500 });
  }
}
