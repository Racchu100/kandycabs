import { NextResponse } from 'next/server';
import { transitionBookingState } from '@/lib/bookingStateMachine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startOtp, odometerReading, meterImageUrl } = body;

    if (!startOtp || !odometerReading) {
      return NextResponse.json({ error: 'startOtp and odometerReading are required' }, { status: 400 });
    }

    if (startOtp !== '4829') {
      return NextResponse.json({ error: 'Invalid OTP provided' }, { status: 400 });
    }

    const nextState = transitionBookingState('OTP_PENDING', 'TRIP_STARTED');

    return NextResponse.json({
      success: true,
      tripId: id,
      status: nextState,
      startOdometer: odometerReading,
      meterImageUrl,
      startTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to start trip' }, { status: 400 });
  }
}
