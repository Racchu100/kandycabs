import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  getAllCoupons,
  upsertCoupon,
  deleteCoupon,
  setCouponSystemEnabled,
  getCouponSystemEnabled,
  CouponDefinition,
} from '@/lib/couponEngine';

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const auth = verifyToken(token || '');

  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const coupons = getAllCoupons();
  return NextResponse.json({
    success: true,
    isCouponSystemEnabled: getCouponSystemEnabled(),
    data: coupons,
  });
}

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      code,
      isActive = true,
      discountType = 'FIXED',
      discountValue = 100,
      minBookingAmount = 500,
      maxDiscount = 500,
      startDate = new Date().toISOString(),
      endDate = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      isUnlimited = false,
      totalUsageLimit = 100,
      perCustomerLimit = 1,
      applicableTripModes = ['ALL'],
    } = body as Partial<CouponDefinition>;

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const couponObj: CouponDefinition = {
      id: `coup_${code.toLowerCase()}_${Date.now()}`,
      code: code.toUpperCase(),
      isActive,
      discountType,
      discountValue,
      minBookingAmount,
      maxDiscount,
      startDate,
      endDate,
      isUnlimited,
      totalUsageLimit: isUnlimited ? 999999 : totalUsageLimit,
      perCustomerLimit,
      totalUses: 0,
      customerUsesMap: {},
      applicableTripModes,
    };

    upsertCoupon(couponObj);

    return NextResponse.json({
      success: true,
      message: `Coupon code '${couponObj.code}' created successfully`,
      coupon: couponObj,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save coupon' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { isCouponSystemEnabled: systemToggle, coupon } = body;

    if (typeof systemToggle === 'boolean') {
      setCouponSystemEnabled(systemToggle);
    }

    if (coupon && coupon.code) {
      upsertCoupon(coupon);
    }

    return NextResponse.json({
      success: true,
      isCouponSystemEnabled: getCouponSystemEnabled(),
      message: 'Coupon system settings updated',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update coupon system settings' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Coupon code query parameter required' }, { status: 400 });
    }

    const deleted = deleteCoupon(code);
    if (!deleted) {
      return NextResponse.json({ error: 'Coupon code not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Coupon '${code.toUpperCase()}' archived successfully`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
