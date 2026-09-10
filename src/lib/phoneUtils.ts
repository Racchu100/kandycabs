/**
 * Centralized Phone Normalization & Search Utilities for Kandy Cabs
 */

/**
 * Strips all non-digit characters and extracts the 10-digit national mobile number.
 * Handles formats like:
 * +919876543210 -> 9876543210
 * 919876543210  -> 9876543210
 * 9876543210    -> 9876543210
 * 09876543210   -> 9876543210
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Returns Prisma OR query variants for phone matching across stored formats.
 */
export function phoneSearchVariants(phone: string | null | undefined): Array<{ phone: string }> {
  const clean = normalizePhone(phone);
  if (!clean || clean.length < 10) return [];
  return [
    { phone: clean },
    { phone: `+91${clean}` },
    { phone: `91${clean}` },
    { phone: `0${clean}` },
  ];
}

/**
 * Returns Prisma OR query variants for customerPhone or driverPhone fields.
 */
export function fieldSearchVariants(fieldName: string, phone: string | null | undefined): Array<Record<string, string>> {
  const clean = normalizePhone(phone);
  if (!clean || clean.length < 10) return [];
  return [
    { [fieldName]: clean },
    { [fieldName]: `+91${clean}` },
    { [fieldName]: `91${clean}` },
    { [fieldName]: `0${clean}` },
  ];
}

/**
 * Formats 10-digit phone number for display (+91 98765 43210).
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const clean = normalizePhone(phone);
  if (!clean || clean.length < 10) return phone || '';
  return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
}
