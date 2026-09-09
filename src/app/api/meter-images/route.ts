import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  recordMeterEvidence,
  getMeterEvidenceComparison,
  adminOverrideStartTrip,
  verifyTripOtp,
} from '@/lib/tripVerificationEngine';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'DRIVER' && auth.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Driver session authentication required for meter capture' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Action 1: Admin OTP Override
    if (action === 'ADMIN_OTP_OVERRIDE') {
      if (auth.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      const { bookingId, reason } = body;
      if (!bookingId || !reason) {
        return NextResponse.json({ error: 'bookingId and reason are required' }, { status: 400 });
      }

      const result = adminOverrideStartTrip(bookingId, auth.userId, auth.role, reason);
      return NextResponse.json({ success: true, message: result.message });
    }

    // Action 2: Driver OTP Verification
    if (action === 'VERIFY_OTP') {
      const { bookingId, otpCode } = body;
      if (!bookingId || !otpCode) {
        return NextResponse.json({ error: 'bookingId and otpCode are required' }, { status: 400 });
      }

      const result = verifyTripOtp(bookingId, otpCode, auth.userId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'OTP verified successfully' });
    }

    // Action 3: Meter Image & Authoritative GPS Evidence Upload
    const {
      bookingId,
      captureType,
      latitude,
      longitude,
      accuracyMeters = 5,
      odometerReadingKm,
      rawImageData,
    } = body;

    if (!bookingId || !captureType || typeof latitude !== 'number' || typeof longitude !== 'number' || !odometerReadingKm) {
      return NextResponse.json(
        { error: 'bookingId, captureType, latitude, longitude, and odometerReadingKm are required' },
        { status: 400 }
      );
    }

    const driverId = auth.userId || 'driver_suresh';
    const evidence = recordMeterEvidence(
      bookingId,
      driverId,
      captureType,
      latitude,
      longitude,
      accuracyMeters,
      odometerReadingKm,
      rawImageData
    );

    return NextResponse.json({
      success: true,
      evidence,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process meter image upload' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('bookingId') || 'KC-88429';

  const comparison = getMeterEvidenceComparison(bookingId);

  return NextResponse.json({
    success: true,
    bookingId,
    comparison,
  });
}
