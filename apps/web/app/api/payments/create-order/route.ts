import { NextRequest, NextResponse } from 'next/server';
import {
  VehicleCategory,
  TripType,
  calculateFare,
} from '@kandy-cabs/shared';
import { calculateRouteDistance } from '@/lib/distance';
import { setCorsHeaders, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      category = VehicleCategory.SEDAN,
      fuelType,
      tripType = TripType.ONEWAY,
      scheduledAt = new Date().toISOString(),
      durationDays = 1,
      packageHours = 8,
      couponCode,
    } = body;

    // 1. Calculate authoritative distance
    let distanceKm = 50;
    if (
      typeof pickupLat === 'number' &&
      typeof pickupLng === 'number' &&
      typeof dropLat === 'number' &&
      typeof dropLng === 'number'
    ) {
      const route = await calculateRouteDistance(pickupLat, pickupLng, dropLat, dropLng);
      distanceKm = route.distanceKm;
    }

    // 2. Compute authoritative fare
    const pricing = calculateFare({
      category,
      fuelType,
      tripType,
      distanceKm,
      scheduledAt,
      durationDays,
      packageHours,
      couponCode,
    });

    const advanceAmount = pricing.advanceAmount;
    const amountInPaise = Math.round(advanceAmount * 100);

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';

    let orderId = `order_mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // If live/real Razorpay credentials are set, call Razorpay Orders API
    if (
      process.env.RAZORPAY_KEY_ID &&
      !process.env.RAZORPAY_KEY_ID.includes('placeholder') &&
      process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_SECRET.includes('placeholder')
    ) {
      try {
        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
        const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
              category,
              tripType,
              advance: advanceAmount,
            },
          }),
        });

        if (razorpayRes.ok) {
          const rzpData = (await razorpayRes.json()) as any;
          orderId = rzpData.id;
        } else {
          console.warn('Razorpay order creation fallback to test mode:', await razorpayRes.text());
        }
      } catch (e) {
        console.warn('Razorpay request failed, fallback to mock orderId:', e);
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        orderId,
        amount: advanceAmount,
        amountInPaise,
        currency: 'INR',
        keyId,
        pricing,
      },
      { status: 200 }
    );
    return setCorsHeaders(response);
  } catch (error: any) {
    console.error('Error in POST /api/payments/create-order:', error);
    const res = NextResponse.json(
      { success: false, message: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}
