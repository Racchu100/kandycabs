/**
 * Secure OTP Hashing using Web Crypto API (compatible with Edge Runtime, Node.js, and browser)
 */

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hashes a numeric OTP with a random 16-byte salt using SHA-256
 * Format: `<saltHex>:<hashHex>`
 */
export async function hashOtp(otp: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bufferToHex(salt.buffer);

  const encoder = new TextEncoder();
  const data = encoder.encode(`${saltHex}:${otp.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = bufferToHex(hashBuffer);

  return `${saltHex}:${hashHex}`;
}

/**
 * Verifies a plaintext OTP against a `<saltHex>:<hashHex>` hash
 */
export async function verifyOtpHash(otp: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [saltHex, expectedHashHex] = storedHash.split(':');

    const encoder = new TextEncoder();
    const data = encoder.encode(`${saltHex}:${otp.trim()}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = bufferToHex(hashBuffer);

    return hashHex === expectedHashHex;
  } catch (error) {
    return false;
  }
}
