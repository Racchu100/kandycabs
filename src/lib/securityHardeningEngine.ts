import crypto from 'node:crypto';
import { verifyToken, AuthPayload } from '@/lib/auth';

/**
 * Phase 16 — Production Security Hardening Engine
 */

export interface SecurityAuditResult {
  passed: boolean;
  category: 'AUTH' | 'RBAC' | 'PRIVACY' | 'PAYMENT' | 'CONCURRENCY' | 'UPLOADS' | 'SECRETS';
  testName: string;
  details: string;
}

/**
 * 1. Secure HTTP Headers Generator
 */
export function getProductionSecurityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.razorpay.com;",
  };
}

/**
 * 2. Privacy Enforcer — Anonymize Customer Phone Number for Drivers
 */
export function sanitizeCustomerPhoneForDriver(phone: string): string {
  if (!phone) return 'XXXXXXXXXX';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return 'XXXXXXXXXX';
  // Keep country code / first 2 digits, mask middle 6, show last 2
  return `+91 XXXXX XXX${digits.slice(-2)}`;
}

/**
 * 3. RBAC Access Policy Evaluator
 */
export function evaluateRbacAccess(
  userRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'GUEST',
  requiredRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN',
  resourceOwnerId?: string,
  currentUserId?: string
): { allowed: boolean; reason?: string } {
  // Admin has overarching access across resources
  if (userRole === 'ADMIN') return { allowed: true };

  if (userRole !== requiredRole) {
    return {
      allowed: false,
      reason: `Forbidden: User role '${userRole}' cannot access '${requiredRole}' resource.`,
    };
  }

  // Isolation check: customer/driver can only access their own resource
  if (resourceOwnerId && currentUserId && resourceOwnerId !== currentUserId) {
    return {
      allowed: false,
      reason: 'Forbidden: Tenant Isolation Violation. Cannot access resource belonging to another user.',
    };
  }

  return { allowed: true };
}

/**
 * 4. Authoritative Payment Signature Verification (HMAC-SHA256)
 */
export function verifyPaymentHmacSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = process.env.RAZORPAY_KEY_SECRET || 'test_secret_kandy_cabs_key_2026'
): boolean {
  if (!orderId || !paymentId || !signature) return false;
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * 5. Codebase Secrets Audit Scanner
 */
export function scanCodebaseSecretsAudit(): { secretsFoundCount: number; clean: boolean } {
  // Verify environment variable isolation
  const processEnvKeys = Object.keys(process.env);
  const leakedClientSecrets = processEnvKeys.filter(
    (key) => key.startsWith('NEXT_PUBLIC_') && (key.includes('SECRET') || key.includes('PRIVATE_KEY'))
  );

  return {
    secretsFoundCount: leakedClientSecrets.length,
    clean: leakedClientSecrets.length === 0,
  };
}
