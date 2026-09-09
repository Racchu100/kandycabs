export interface CouponDefinition {
  id: string;
  code: string; // e.g. 'SUMMER20'
  isActive: boolean;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number; // e.g. 200 for FIXED, 10 for PERCENTAGE
  minBookingAmount: number; // e.g. 1000
  maxDiscount: number; // e.g. 300 cap
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  isUnlimited: boolean; // true = unlimited, false = limited
  totalUsageLimit: number; // e.g. 100 if limited
  perCustomerLimit: number; // e.g. 1
  totalUses: number;
  customerUsesMap: Record<string, number>; // customerId -> count
  applicableTripModes: string[]; // ['ALL'] or ['ONEWAY', 'ROUND']
}

// Global coupon system master switch
let isCouponSystemEnabled = true;

export function setCouponSystemEnabled(enabled: boolean): void {
  isCouponSystemEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kc_coupon_system_enabled', JSON.stringify(enabled));
    } catch {}
  }
}

export function getCouponSystemEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_coupon_system_enabled');
      if (stored !== null) return JSON.parse(stored);
    } catch {}
  }
  return isCouponSystemEnabled;
}

const couponStore = new Map<string, CouponDefinition>();

// Seed default initial coupons
const INITIAL_COUPONS: CouponDefinition[] = [
  {
    id: 'coup_coastal200',
    code: 'COASTAL200',
    isActive: true,
    discountType: 'FIXED',
    discountValue: 200,
    minBookingAmount: 1000,
    maxDiscount: 200,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    isUnlimited: false,
    totalUsageLimit: 500,
    perCustomerLimit: 2,
    totalUses: 12,
    customerUsesMap: { cust_used_out: 2 },
    applicableTripModes: ['ALL'],
  },
  {
    id: 'coup_first10',
    code: 'FIRST10',
    isActive: true,
    discountType: 'PERCENTAGE',
    discountValue: 10, // 10%
    minBookingAmount: 800,
    maxDiscount: 300, // max ₹300 off
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    isUnlimited: true,
    totalUsageLimit: 99999,
    perCustomerLimit: 1,
    totalUses: 45,
    customerUsesMap: { cust_used_first: 1 },
    applicableTripModes: ['ALL'],
  },
  {
    id: 'coup_expired',
    code: 'EXPIRED50',
    isActive: true,
    discountType: 'FIXED',
    discountValue: 50,
    minBookingAmount: 100,
    maxDiscount: 50,
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z', // Expired in past
    isUnlimited: false,
    totalUsageLimit: 100,
    perCustomerLimit: 1,
    totalUses: 0,
    customerUsesMap: {},
    applicableTripModes: ['ALL'],
  },
  {
    id: 'coup_inactive',
    code: 'INACTIVE',
    isActive: false, // Inactive
    discountType: 'FIXED',
    discountValue: 100,
    minBookingAmount: 500,
    maxDiscount: 100,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    isUnlimited: true,
    totalUsageLimit: 99999,
    perCustomerLimit: 1,
    totalUses: 0,
    customerUsesMap: {},
    applicableTripModes: ['ALL'],
  },
];

INITIAL_COUPONS.forEach((c) => couponStore.set(c.code.toUpperCase(), c));

function persistCoupons(): void {
  if (typeof window !== 'undefined') {
    try {
      const list = Array.from(couponStore.values());
      localStorage.setItem('kc_admin_coupons', JSON.stringify(list));
    } catch {}
  }
}

export function getAllCoupons(): CouponDefinition[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kc_admin_coupons');
      if (stored) {
        const parsed: CouponDefinition[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((c) => couponStore.set(c.code.toUpperCase(), c));
        }
      }
    } catch {}
  }
  return Array.from(couponStore.values());
}

export function upsertCoupon(coupon: Partial<CouponDefinition> & { code: string }): CouponDefinition {
  const cleanCode = coupon.code.toUpperCase().trim();
  const existing = couponStore.get(cleanCode);
  
  const isUnl = coupon.isUnlimited !== undefined ? coupon.isUnlimited : (existing ? existing.isUnlimited : false);
  const updated: CouponDefinition = {
    id: existing?.id || coupon.id || `coup_${cleanCode.toLowerCase()}_${Date.now()}`,
    code: cleanCode,
    isActive: coupon.isActive !== undefined ? coupon.isActive : (existing ? existing.isActive : true),
    discountType: coupon.discountType || existing?.discountType || 'PERCENTAGE',
    discountValue: coupon.discountValue !== undefined ? coupon.discountValue : (existing?.discountValue || 10),
    minBookingAmount: coupon.minBookingAmount !== undefined ? coupon.minBookingAmount : (existing?.minBookingAmount || 0),
    maxDiscount: coupon.maxDiscount !== undefined ? coupon.maxDiscount : (existing?.maxDiscount || 500),
    startDate: coupon.startDate || existing?.startDate || new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    endDate: coupon.endDate || existing?.endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    isUnlimited: isUnl,
    totalUsageLimit: isUnl ? 999999 : (coupon.totalUsageLimit !== undefined ? coupon.totalUsageLimit : (existing?.totalUsageLimit || 100)),
    perCustomerLimit: coupon.perCustomerLimit !== undefined ? coupon.perCustomerLimit : (existing?.perCustomerLimit || 1),
    totalUses: coupon.totalUses !== undefined ? coupon.totalUses : (existing ? existing.totalUses : 0),
    customerUsesMap: coupon.customerUsesMap !== undefined ? coupon.customerUsesMap : (existing ? existing.customerUsesMap : {}),
    applicableTripModes: coupon.applicableTripModes || existing?.applicableTripModes || ['ALL'],
  };

  couponStore.set(cleanCode, updated);
  persistCoupons();
  return updated;
}

export function deleteCoupon(code: string): boolean {
  const deleted = couponStore.delete(code.toUpperCase().trim());
  persistCoupons();
  return deleted;
}

export interface CouponValidationInput {
  code: string;
  bookingAmount: number;
  customerId?: string;
  tripMode?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountAmount: number;
  updatedFare: number;
  reason?: string;
}

/**
 * Authoritative Server-Side Coupon Validation Engine
 */
export function validateCoupon(input: CouponValidationInput): CouponValidationResult {
  const { code, bookingAmount, customerId = 'guest', tripMode = 'ONEWAY' } = input;
  const cleanCode = code.toUpperCase().trim();

  // 1. Global Coupon System Enabled Check
  if (!isCouponSystemEnabled) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: 'The coupon promotional system is currently disabled by administrator.',
    };
  }

  // 2. Code Existence Check
  const coupon = couponStore.get(cleanCode);
  if (!coupon) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `Coupon code '${cleanCode}' is invalid or does not exist.`,
    };
  }

  // 3. Active State Check
  if (!coupon.isActive) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `Coupon code '${cleanCode}' is currently deactivated.`,
    };
  }

  // 4. Date Range Check
  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);
  if (now < start || now > end) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `Coupon code '${cleanCode}' has expired or is not yet active.`,
    };
  }

  // 5. Minimum Booking Amount Check
  if (bookingAmount < coupon.minBookingAmount) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `Minimum booking value of ₹${coupon.minBookingAmount.toLocaleString()} is required for code '${cleanCode}'.`,
    };
  }

  // 6. Total Usage Limit Check (Skipped if isUnlimited)
  if (!coupon.isUnlimited && coupon.totalUses >= coupon.totalUsageLimit) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `Coupon code '${cleanCode}' has reached its maximum total redemptions limit of ${coupon.totalUsageLimit} uses.`,
    };
  }

  // 7. Per-Customer Usage Limit Check
  const custUses = coupon.customerUsesMap[customerId] || 0;
  if (custUses >= coupon.perCustomerLimit) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `You have already redeemed coupon code '${cleanCode}' the maximum allowed ${coupon.perCustomerLimit} time(s).`,
    };
  }

  // 8. Applicable Trip Mode Check
  if (
    coupon.applicableTripModes.length > 0 &&
    !coupon.applicableTripModes.includes('ALL') &&
    !coupon.applicableTripModes.includes(tripMode.toUpperCase())
  ) {
    return {
      valid: false,
      code: cleanCode,
      discountAmount: 0,
      updatedFare: bookingAmount,
      reason: `Coupon code '${cleanCode}' is not applicable for ${tripMode} bookings.`,
    };
  }

  // 9. Calculate Authoritative Discount
  let rawDiscount = 0;
  if (coupon.discountType === 'FIXED') {
    rawDiscount = coupon.discountValue;
  } else {
    rawDiscount = (bookingAmount * coupon.discountValue) / 100;
  }

  const cappedDiscount = Math.min(rawDiscount, coupon.maxDiscount, bookingAmount);
  const finalDiscount = Math.round(cappedDiscount);
  const updatedFare = Math.max(0, bookingAmount - finalDiscount);

  return {
    valid: true,
    code: cleanCode,
    discountAmount: finalDiscount,
    updatedFare,
  };
}

export function recordCouponRedemption(code: string, customerId: string): void {
  const cleanCode = code.toUpperCase().trim();
  const coupon = couponStore.get(cleanCode);
  if (coupon) {
    coupon.totalUses += 1;
    coupon.customerUsesMap[customerId] = (coupon.customerUsesMap[customerId] || 0) + 1;
    couponStore.set(cleanCode, coupon);
  }
}
