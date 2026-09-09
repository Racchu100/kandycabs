-- CreateEnums
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'CONFIRMED', 'WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'OTP_PENDING', 'TRIP_STARTED', 'COMPLETED', 'CANCELLED', 'PAYMENT_FAILED');
CREATE TYPE "TripMode" AS ENUM ('ONEWAY', 'ROUND', 'AIRPORT', 'LOCAL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT');
CREATE TYPE "LocationType" AS ENUM ('PICKUP', 'DROP', 'WAYPOINT');
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN');
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'IN_APP');

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "fullName" TEXT NOT NULL,
    "emergencyContact" TEXT,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable vehicles
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationNumber" TEXT NOT NULL UNIQUE,
    "modelName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "fuelType" TEXT NOT NULL,
    "baseRatePerKm" DOUBLE PRECISION NOT NULL,
    "driverAllowancePerDay" DOUBLE PRECISION NOT NULL,
    "ac" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable drivers
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "fullName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL UNIQUE,
    "badgeNumber" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "vehicleId" TEXT REFERENCES "vehicles"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable admins
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "roleTitle" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable vehicle_images
CREATE TABLE "vehicle_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
    "imageUrl" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable tour_packages
CREATE TABLE "tour_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "duration" TEXT NOT NULL,
    "startingPrice" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable package_images
CREATE TABLE "package_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL REFERENCES "tour_packages"("id") ON DELETE CASCADE,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable coupons
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minBookingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable bookings
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingReference" TEXT NOT NULL UNIQUE,
    "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
    "vehicleId" TEXT REFERENCES "vehicles"("id"),
    "packageId" TEXT REFERENCES "tour_packages"("id"),
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "tripMode" "TripMode" NOT NULL DEFAULT 'ONEWAY',
    "pickupAddress" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "pickupTime" TIMESTAMP(3) NOT NULL,
    "estimatedDistanceKm" DOUBLE PRECISION NOT NULL,
    "estimatedFare" DOUBLE PRECISION NOT NULL,
    "finalFare" DOUBLE PRECISION,
    "couponId" TEXT REFERENCES "coupons"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable booking_locations
CREATE TABLE "booking_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "locationType" "LocationType" NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable booking_passengers
CREATE TABLE "booking_passengers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT
);

-- CreateTable pricing_rules
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleCategory" TEXT NOT NULL,
    "tripMode" "TripMode" NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "perKmRate" DOUBLE PRECISION NOT NULL,
    "minKmPerDay" DOUBLE PRECISION NOT NULL,
    "driverDayAllowance" DOUBLE PRECISION NOT NULL,
    "driverNightAllowance" DOUBLE PRECISION NOT NULL
);

-- CreateTable fare_snapshots
CREATE TABLE "fare_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "distanceFare" DOUBLE PRECISION NOT NULL,
    "nightAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "driverAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL,
    "totalFare" DOUBLE PRECISION NOT NULL
);

-- CreateTable coupon_usage
CREATE TABLE "coupon_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couponId" TEXT NOT NULL REFERENCES "coupons"("id"),
    "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
    "bookingId" TEXT NOT NULL UNIQUE REFERENCES "bookings"("id"),
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL REFERENCES "bookings"("id"),
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable trips
CREATE TABLE "trips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL REFERENCES "bookings"("id"),
    "driverId" TEXT NOT NULL REFERENCES "drivers"("id"),
    "vehicleId" TEXT NOT NULL REFERENCES "vehicles"("id"),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "startOdometer" DOUBLE PRECISION,
    "endOdometer" DOUBLE PRECISION,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRIVER_ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable trip_otp
CREATE TABLE "trip_otp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "startOtp" TEXT NOT NULL,
    "endOtp" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable gps_tracking
CREATE TABLE "gps_tracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "driverId" TEXT NOT NULL REFERENCES "drivers"("id"),
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable meter_images
CREATE TABLE "meter_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "imageType" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "odometerReading" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable meter_gps_evidence
CREATE TABLE "meter_gps_evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "meterImageId" TEXT NOT NULL REFERENCES "meter_images"("id") ON DELETE CASCADE,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable messages
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable locations
CREATE TABLE "locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL DEFAULT 'PICKUP',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL
);

-- CreateTable reviews
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL REFERENCES "bookings"("id"),
    "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
    "vehicleId" TEXT REFERENCES "vehicles"("id"),
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT REFERENCES "users"("id"),
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable system_settings
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndexes
CREATE INDEX "idx_bookings_status" ON "bookings"("status");
CREATE INDEX "idx_bookings_pickuptime" ON "bookings"("pickupTime");
CREATE INDEX "idx_bookings_customer" ON "bookings"("customerId");
CREATE INDEX "idx_bookings_vehicle" ON "bookings"("vehicleId");

CREATE INDEX "idx_payments_status" ON "payments"("status");
CREATE INDEX "idx_payments_booking" ON "payments"("bookingId");

CREATE INDEX "idx_trips_status" ON "trips"("status");
CREATE INDEX "idx_trips_driver" ON "trips"("driverId");

CREATE INDEX "idx_gps_trip" ON "gps_tracking"("tripId");
CREATE INDEX "idx_gps_timestamp" ON "gps_tracking"("timestamp");

CREATE INDEX "idx_coupons_code" ON "coupons"("code");
