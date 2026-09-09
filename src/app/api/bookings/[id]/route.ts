import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken, maskPhoneNumber } from '@/lib/auth';
import { transitionBookingState, BookingState, InvalidStateTransitionError } from '@/lib/bookingStateMachine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  // 1. UNAUTHORIZED ACCESS CHECK
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Session missing or invalid' }, { status: 401 });
  }

  // Mock booking record for customer 'cust_1234'
  const mockBookingOwnerId = 'cust_1234';

  // 2. CUSTOMER ISOLATION ACCESS CONTROL
  if (auth.role === 'CUSTOMER' && auth.customerId && auth.customerId !== mockBookingOwnerId) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to view another customer\'s booking.' },
      { status: 403 }
    );
  }

  const rawCustomerPhone = '+919845012345';
  const customerPhone = auth.role === 'DRIVER' ? maskPhoneNumber(rawCustomerPhone) : rawCustomerPhone;

  return NextResponse.json({
    success: true,
    booking: {
      id,
      bookingReference: 'KC-88429',
      customerId: mockBookingOwnerId,
      status: 'DRIVER_ASSIGNED' as BookingState,
      statusLabel: 'Driver En Route to Pickup Location',
      tripMode: 'ONEWAY',
      pickupAddress: 'Mangaluru Central Railway Station',
      dropAddress: 'Udupi Sri Krishna Matha',
      pickupTime: new Date().toISOString(),
      vehicleName: 'Maruti Suzuki Swift Dzire',
      vehicleRegistration: 'KA 19 C 4829',
      driverName: 'Suresh Gowda',
      driverPhone: '+91 99008 87777', // Permitted dispatch/driver phone for customer
      tripStartOtp: '4829', // OTP for trip start verification
      paymentStatus: 'ADVANCE_PAID',
      customer: {
        name: 'Rajesh Bhat',
        phone: customerPhone,
      },
      fareBreakdown: {
        totalFare: 1890,
        advanceAmount: 378,
        remainingAmount: 1512,
        tollNotice: 'Toll charges are extra and payable separately.',
      },
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentState, targetState } = body as {
      currentState: BookingState;
      targetState: BookingState;
    };

    if (!currentState || !targetState) {
      return NextResponse.json({ error: 'currentState and targetState are required' }, { status: 400 });
    }

    const nextState = transitionBookingState(currentState, targetState);

    return NextResponse.json({
      success: true,
      bookingId: id,
      previousState: currentState,
      newState: nextState,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof InvalidStateTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 });
  }
}
