/**
 * Normalizes an Indian phone number to E.164 format (+91XXXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  if (phone.startsWith('+91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  // Return cleaned or fallback
  return phone.trim();
}

/**
 * Validates whether a phone number is a valid 10-digit Indian mobile number
 */
export function isValidIndianPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return /^[6-9]\d{9}$/.test(cleaned);
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(cleaned.substring(2));
  }
  return false;
}
