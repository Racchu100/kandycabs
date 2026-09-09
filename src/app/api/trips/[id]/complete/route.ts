import { NextResponse } from 'next/server';
import { transitionBookingState } from '@/lib/bookingStateMachine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { endOtp, endOdometer, meterImageUrl } = body;

    if (!endOtp || !endOdometer) {
      return NextResponse.json({ error: 'endOtp and endOdometer are required' }, { status: 400 });
    }

    const nextState = transitionBookingState('TRIP_STARTED', 'COMPLETED');

    return NextResponse.json({
      success: true,
      tripId: id,
      status: nextState,
      endOdometer,
      meterImageUrl,
      endTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to complete trip' }, { status: 400 });
  }
}
