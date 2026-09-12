/**
 * Phone Number Normalization Utility for Kandy Cabs
 * Cleans user phone inputs and generates query variants for robust database lookups.
 */

/**
 * Strips all non-digit characters and returns the last 10 digits.
 * Example: "+91 98765-43210" -> "9876543210"
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}

/**
 * Generates an array of phone format variants for legacy-compatible OR queries in Prisma.
 * Example for "9876543210":
 * ["9876543210", "+919876543210", "919876543210", "09876543210"]
 */
export function phoneSearchVariants(rawPhone: string): string[] {
  const last10 = normalizePhone(rawPhone);
  if (!last10 || last10.length !== 10) {
    return rawPhone ? [rawPhone] : [];
  }
  return [
    last10,
    `+91${last10}`,
    `91${last10}`,
    `0${last10}`,
  ];
}
