import { signToken, UserRole } from '@/lib/auth';

export interface OtpRecord {
  mobile: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const otpStore = new Map<string, OtpRecord>();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes expiry
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown
const MAX_ATTEMPTS = 3; // Lock after 3 failed attempts

function normalizePhoneKey(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return phone.trim().toLowerCase();
}

export function requestMobileOtp(mobile: string): { success: boolean; message: string; cooldownRemainingSec?: number } {
  const cleanMobile = mobile.trim();
  if (cleanMobile.length < 3) {
    return { success: false, message: 'Invalid mobile number or username' };
  }

  const key = normalizePhoneKey(cleanMobile);
  const existing = otpStore.get(key);
  const now = Date.now();

  // Check Resend Cooldown
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingSec} seconds before requesting a new OTP.`,
      cooldownRemainingSec: remainingSec,
    };
  }

  // Generate 4-digit OTP (e.g. "4829" or random 4-digit)
  const otp = cleanMobile === '9845012345' ? '4829' : Math.floor(1000 + Math.random() * 9000).toString();

  otpStore.set(key, {
    mobile: cleanMobile,
    otp,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });

  return {
    success: true,
    message: `OTP sent successfully to ${cleanMobile}. (Mock OTP: ${otp})`,
  };
}

export function verifyMobileOtp(mobile: string, userOtp: string): { success: boolean; token?: string; user?: any; error?: string } {
  const cleanMobile = mobile.trim();
  const cleanOtp = userOtp.trim();
  const key = normalizePhoneKey(cleanMobile);

  // Universal test bypass OTP check (4829)
  if (cleanOtp === '4829') {
    const suffix = key.length >= 4 ? key.slice(-4) : '9999';
    const mockCustomerId = `cust_${suffix}`;
    const mockUserId = `user_${suffix}`;
    const mockRole: UserRole = 'CUSTOMER';

    const token =
      typeof window !== 'undefined'
        ? `otp_token_${Date.now()}`
        : signToken({
            userId: mockUserId,
            email: '',
            phone: cleanMobile,
            role: mockRole,
            customerId: mockCustomerId,
          });

    return {
      success: true,
      token,
      user: {
        id: mockUserId,
        customerId: mockCustomerId,
        phone: cleanMobile,
        fullName: '',
        role: mockRole,
      },
    };
  }

  const record = otpStore.get(key);

  if (!record) {
    return { success: false, error: 'No OTP request found for this mobile number. Please request a new OTP.' };
  }

  const now = Date.now();

  // Check Expiry
  if (now > record.expiresAt) {
    otpStore.delete(key);
    return { success: false, error: 'OTP has expired. Please request a new OTP.' };
  }

  // Check Attempt Lockout
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' };
  }

  // Verify OTP match
  if (record.otp !== cleanOtp) {
    record.attempts += 1;
    otpStore.set(key, record);
    const remainingAttempts = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`,
    };
  }

  // OTP Verified Successfully! Consume OTP record.
  otpStore.delete(key);

  const suffix = key.length >= 4 ? key.slice(-4) : '9999';
  const mockCustomerId = `cust_${suffix}`;
  const mockUserId = `user_${suffix}`;
  const mockRole: UserRole = 'CUSTOMER';

  const token =
    typeof window !== 'undefined'
      ? `otp_token_${Date.now()}`
      : signToken({
          userId: mockUserId,
          email: '',
          phone: cleanMobile,
          role: mockRole,
          customerId: mockCustomerId,
        });

  return {
    success: true,
    token,
    user: {
      id: mockUserId,
      customerId: mockCustomerId,
      phone: cleanMobile,
      fullName: '',
      role: mockRole,
    },
  };
}
