import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { calculateAndValidateDistance } from '@/lib/distanceEngine';
import { freezeFareSnapshot, formatINR } from '@/lib/productionPricingEngine';
import { validateCoupon, recordCouponRedemption } from '@/lib/couponEngine';
import { getExistingBookingByIdempotencyKey, saveBookingIdempotencyKey } from '@/lib/idempotency';
import { createCustomerBooking, getAdminBookings } from '@/lib/adminEngine';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  const allBookings = getAdminBookings();
  const userPhone = auth.phone ? auth.phone.replace(/\D/g, '') : '';
  const userPhoneSuffix = userPhone.length >= 10 ? userPhone.slice(-10) : userPhone;

  const userBookings = allBookings.filter((b) => {
    const bPhone = (b.customerPhone || '').replace(/\D/g, '');
    const phoneMatch = Boolean(userPhoneSuffix && userPhoneSuffix.length >= 7 && bPhone.includes(userPhoneSuffix));
    const idMatch = Boolean(auth.customerId && ((b as any).customerId === auth.customerId || b.customerPhone === auth.phone));
    return phoneMatch || idMatch;
  });

  return NextResponse.json({
    success: true,
    page,
    limit,
    total: userBookings.length,
    data: userBookings,
  });
}

export async function POST(request: Request) {
  try {
    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key');

    if (idempotencyKey) {
      const existingBooking = getExistingBookingByIdempotencyKey(idempotencyKey);
      if (existingBooking) {
        return NextResponse.json({
          success: true,
          isDuplicatePrevented: true,
          booking: existingBooking.booking,
          fareSnapshot: existingBooking.fareSnapshot,
        });
      }
    }

    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    const body = await request.json();
    const {
      tripMode = 'ONEWAY',
      tripDays,
      pickupAddress,
      dropAddress,
      pickupLat = 12.9141,
      pickupLng = 74.856,
      dropLat = 13.3409,
      dropLng = 74.7421,
      pickupTime,
      returnTime,
      vehicleCategory = 'sedan',
      passengers = 1,
      passengerName,
      passengerPhone,
      passengerEmail,
      couponCode,
      payloadIdempotencyKey,
    } = body;

    const finalKey = idempotencyKey || payloadIdempotencyKey;

    if (finalKey) {
      const existing = getExistingBookingByIdempotencyKey(finalKey);
      if (existing) {
        return NextResponse.json({
          success: true,
          isDuplicatePrevented: true,
          booking: existing.booking,
          fareSnapshot: existing.fareSnapshot,
        });
      }
    }

    // 1. ROUND TRIP DATE & DURATION VALIDATION
    let finalTripDays = 1;
    if (tripMode === 'ROUND' || tripMode === 'round') {
      if (tripDays) {
        finalTripDays = Math.max(1, parseInt(tripDays, 10));
      } else if (pickupTime && returnTime) {
        const pDate = new Date(pickupTime);
        const rDate = new Date(returnTime);
        if (rDate <= pDate) {
          return NextResponse.json(
            { error: 'Return date/time must be strictly after pickup date/time.' },
            { status: 400 }
          );
        }
        const diffMs = rDate.getTime() - pDate.getTime();
        finalTripDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        finalTripDays = 2;
      }
    }

    // 2. SERVER-SIDE DISTANCE RECALCULATION
    const distanceResult = await calculateAndValidateDistance(
      { lat: pickupLat, lng: pickupLng, address: pickupAddress },
      { lat: dropLat, lng: dropLng, address: dropAddress }
    );

    // 3. AUTHORITATIVE SERVER-SIDE COUPON VALIDATION
    let appliedDiscount = 0;
    const customerId = auth?.customerId || 'guest_customer';

    if (couponCode) {
      // Calculate pre-discount raw fare
      const preDiscountSnapshot = freezeFareSnapshot('temp', {
        distanceKm: distanceResult.distanceKm,
        vehicleCategory,
        tripMode,
        tripDays: finalTripDays,
      });

      const couponValidation = validateCoupon({
        code: couponCode,
        bookingAmount: preDiscountSnapshot.final_amount,
        customerId,
        tripMode,
      });

      if (!couponValidation.valid) {
        return NextResponse.json({ error: couponValidation.reason }, { status: 400 });
      }

      appliedDiscount = couponValidation.discountAmount;
      recordCouponRedemption(couponCode, customerId);
    }

    const bookingId = `bk_${Date.now()}`;
    const bookingReference = `KC-${Math.floor(10000 + Math.random() * 90000)}`;

    // 4. AUTHORITATIVE PRODUCTION FARE SNAPSHOT (IMMUTABLE)
    const fareSnapshot = freezeFareSnapshot(bookingId, {
      distanceKm: distanceResult.distanceKm,
      vehicleCategory,
      tripMode,
      tripDays: finalTripDays,
      couponDiscount: appliedDiscount,
    });

    const newBookingData = {
      id: bookingId,
      bookingReference,
      customerId,
      status: 'DRAFT',
      tripMode,
      tripDays: finalTripDays,
      pickupAddress: pickupAddress || 'Mangaluru',
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      dropAddress: dropAddress || 'Udupi',
      dropLatitude: dropLat,
      dropLongitude: dropLng,
      pickupTime: pickupTime || new Date().toISOString(),
      returnTime: returnTime || null,
      estimatedDistanceKm: distanceResult.distanceKm,
      estimatedDurationMinutes: distanceResult.durationMinutes,
      estimatedFare: fareSnapshot.final_amount,
      passengers,
      passengerDetails: {
        name: passengerName || 'Rider',
        phone: passengerPhone || '+919900887777',
        email: passengerEmail || null,
      },
      couponApplied: couponCode ? couponCode.toUpperCase() : null,
      createdAt: new Date().toISOString(),
    };

    // Register booking into Admin Control Console
    try {
      createCustomerBooking({
        bookingReference,
        customerName: passengerName || 'Customer',
        customerPhone: passengerPhone || '+919845012345',
        pickupAddress: pickupAddress || 'Mangaluru',
        dropAddress: dropAddress || 'Udupi',
        pickupTime: `${pickupTime || new Date().toISOString()}`,
        tripMode: tripMode === 'ONEWAY' ? 'One-Way Outstation' : tripMode === 'ROUND' ? 'Round Trip' : 'Local Rental',
        tripDays: finalTripDays,
        estimatedFare: fareSnapshot.final_amount,
        advancePaid: fareSnapshot.advance_amount,
        remainingFare: fareSnapshot.final_amount - fareSnapshot.advance_amount,
      });
    } catch {}

    const responsePayload = {
      booking: newBookingData,
      fareSnapshot,
      formattedTotal: formatINR(fareSnapshot.final_amount),
      formattedAdvance: formatINR(fareSnapshot.advance_amount),
      tollNotice: fareSnapshot.toll_notice,
    };

    if (finalKey) {
      saveBookingIdempotencyKey(finalKey, responsePayload);
    }

    return NextResponse.json({
      success: true,
      ...responsePayload,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
