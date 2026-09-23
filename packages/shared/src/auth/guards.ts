import { UserProfile } from './types';
import { UserRole, DriverVerificationStatus } from '../types';

/**
 * Checks whether the user has a given role
 */
export function hasRole(user: UserProfile | null | undefined, role: UserRole): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

/**
 * Checks whether the user is an active, verified driver allowed to access driver app
 */
export function canAccessDriverApp(user: UserProfile | null | undefined): boolean {
  if (!user || !hasRole(user, UserRole.DRIVER)) return false;
  return user.driver?.verificationStatus === DriverVerificationStatus.APPROVED;
}

/**
 * Checks whether the user is an admin
 */
export function canAccessAdmin(user: UserProfile | null | undefined): boolean {
  return hasRole(user, UserRole.ADMIN);
}

/**
 * Checks customer access: Allows guests pre-OTP, or logged in users with CUSTOMER role
 */
export function canAccessCustomerBooking(
  user: UserProfile | null | undefined,
  requiresAuth: boolean = false
): boolean {
  if (!requiresAuth) return true; // Guest allowed pre-checkout/payment
  return hasRole(user, UserRole.CUSTOMER);
}
