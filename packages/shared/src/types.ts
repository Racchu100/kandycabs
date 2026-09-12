/**
 * Shared Type Definitions and System Contracts for Kandy Cabs
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum DriverStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum DriverApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export enum VehicleCategory {
  HATCHBACK = 'HATCHBACK',
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  SUV_PREMIUM = 'SUV_PREMIUM',
  TEMPO_TRAVELER = 'TEMPO_TRAVELER',
}

export enum TripType {
  ONEWAY = 'ONEWAY',
  ROUND = 'ROUND',
  LOCAL = 'LOCAL',
  AIRPORT = 'AIRPORT',
  PACKAGE = 'PACKAGE',
}

export enum CouponType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
}

export enum BookingStatus {
  PENDING_ADMIN = 'PENDING_ADMIN',
  DISPATCHED = 'DISPATCHED',
  DRIVER_ACCEPTED = 'DRIVER_ACCEPTED',
  DRIVER_EN_ROUTE = 'DRIVER_EN_ROUTE',
  TRIP_STARTED = 'TRIP_STARTED',
  TRIP_COMPLETED = 'TRIP_COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DispatchResponse {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export enum TripEventType {
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  OTP_VERIFIED = 'OTP_VERIFIED',
  TRIP_STARTED = 'TRIP_STARTED',
  TRIP_ENDED = 'TRIP_ENDED',
  TOLL_ADDED = 'TOLL_ADDED',
  CONTACT_RELEASED = 'CONTACT_RELEASED',
}

export enum TripMediaType {
  START_ODOMETER = 'START_ODOMETER',
  END_ODOMETER = 'END_ODOMETER',
  INTERIOR_CHECK = 'INTERIOR_CHECK',
  TOLL_RECEIPT = 'TOLL_RECEIPT',
}

export enum PaymentGateway {
  RAZORPAY = 'RAZORPAY',
  MANUAL_UPI = 'MANUAL_UPI',
}

export enum PaymentType {
  ADVANCE = 'ADVANCE',
  BALANCE = 'BALANCE',
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface LocationPing {
  bookingId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDegrees?: number;
  accuracy?: number;
  recordedAt: Date | string;
}

export interface PricingBreakdown {
  tripType: TripType;
  vehicleCategory: VehicleCategory;
  distanceKm: number;
  billedKm: number;
  perKmRate: number;
  baseFare: number;
  driverAllowance: number;
  nightCharge: number;
  gstAmount: number;
  gstPercent: number;
  couponDiscount: number;
  estimatedTotal: number;
  advanceAmount: number; // 25%
  balanceAmount: number; // 75%
  tollNote: string;
}
