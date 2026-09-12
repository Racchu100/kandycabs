import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kandy_cabs_super_secret_jwt_key_2026';

export interface TokenPayload {
  userId: string;
  phone: string;
  fullName: string;
  roles: string[];
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}
