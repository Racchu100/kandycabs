import { SignJWT, jwtVerify } from 'jose';
import { AuthTokenPayload } from './types';

const DEFAULT_JWT_SECRET = 'super-secret-jwt-key-change-in-production';

function getJwtSecretKey(secret?: string): Uint8Array {
  const secretString = secret || process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return new TextEncoder().encode(secretString);
}

/**
 * Signs an auth payload into a JWT valid for 30 days
 */
export async function signAuthToken(
  payload: AuthTokenPayload,
  secret?: string
): Promise<string> {
  const key = getJwtSecretKey(secret);
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

/**
 * Verifies an auth token and returns the parsed payload, or null if invalid/expired
 */
export async function verifyAuthToken(
  token: string,
  secret?: string
): Promise<AuthTokenPayload | null> {
  try {
    const key = getJwtSecretKey(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}
