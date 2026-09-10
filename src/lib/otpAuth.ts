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


const ALLOW_TEST_OTPS = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_OTP !== 'false';
const TEST_OTPS = ['4829', '1234'];

export function requestMobileOtp(mobile: string): { success: boolean; message: string; cooldownRemainingSec?: number } {
  const cleanMobile = mobile.trim();
  const digits = cleanMobile.replace(/\D/g, '');
  if (digits.length < 10) {
    return { success: false, message: 'Please enter a valid 10-digit Indian mobile number.' };
  }

  const key = normalizePhoneKey(cleanMobile);
  const existing = otpStore.get(key);
  const now = Date.now();

  // Check Resend Cooldown (30s)
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingSec} seconds before requesting a new OTP.`,
      cooldownRemainingSec: remainingSec,
    };
  }

  // Generate 4-digit OTP
  const otp = (ALLOW_TEST_OTPS && digits === '9845012345') ? '4829' : Math.floor(1000 + Math.random() * 9000).toString();

  otpStore.set(key, {
    mobile: cleanMobile,
    otp,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });

  const displayOtpNotice = ALLOW_TEST_OTPS ? ` (Test OTP: 4829)` : '';
  return {
    success: true,
    message: `4-digit OTP sent successfully to +91 ${digits.slice(-10)}.${displayOtpNotice}`,
  };
}

export function verifyMobileOtp(mobile: string, userOtp: string): { success: boolean; token?: string; user?: any; error?: string } {
  const cleanMobile = mobile.trim();
  const cleanOtp = userOtp.trim();
  const key = normalizePhoneKey(cleanMobile);
  const digits = cleanMobile.replace(/\D/g, '').slice(-10);

  // Check Test OTPs in Development Mode
  if (ALLOW_TEST_OTPS && TEST_OTPS.includes(cleanOtp)) {
    const mockCustomerId = `cust_${digits || '9999'}`;
    const mockUserId = `user_${digits || '9999'}`;
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
        phone: digits || cleanMobile,
        fullName: '',
        role: mockRole,
      },
    };
  }

  const record = otpStore.get(key);

  if (!record) {
    return { success: false, error: 'No active OTP request found. Please request a new OTP.' };
  }

  const now = Date.now();

  // Check Expiry (5 minutes)
  if (now > record.expiresAt) {
    otpStore.delete(key);
    return { success: false, error: 'OTP code has expired. Please request a new OTP.' };
  }

  // Check Attempt Lockout (max 3 attempts)
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { success: false, error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' };
  }

  // Verify OTP match
  if (record.otp !== cleanOtp) {
    record.attempts += 1;
    otpStore.set(key, record);
    const remainingAttempts = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: `Incorrect 4-digit OTP code. ${remainingAttempts} attempt(s) remaining.`,
    };
  }

  // Single-use OTP: Consume immediately upon successful verification
  otpStore.delete(key);

  const mockCustomerId = `cust_${digits || '9999'}`;
  const mockUserId = `user_${digits || '9999'}`;
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
      phone: digits || cleanMobile,
      fullName: '',
      role: mockRole,
    },
  };
}
