/**
 * Generates a numeric OTP of specified length (default: 4 digits for pickup OTP, 6 digits for auth)
 */
export function generateOtp(length: number = 4): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Validates whether the entered OTP matches the expected OTP
 */
export function verifyOtp(inputOtp: string, expectedOtp: string): boolean {
  if (!inputOtp || !expectedOtp) return false;
  return inputOtp.trim() === expectedOtp.trim();
}
