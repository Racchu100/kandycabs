import { NextResponse } from 'next/server';
import { setCustomerPassword } from '@/lib/customerAccountEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, newPassword } = body;

    if (!identifier || !newPassword) {
      return NextResponse.json({ error: 'Mobile / Username and New Password are required' }, { status: 400 });
    }

    const result = setCustomerPassword(identifier, newPassword);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully! You can now log in using your password.',
      customer: result.customer,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
