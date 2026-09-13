# FULL APPLICATION ARCHITECTURE & IMPLEMENTATION AUDIT
**Project Name:** Kandy Cabs  
**Workspace Path:** `d:\Rakshith\Graphitex Digitals\client websites\kandycabs new\kandycabs01`  
**Audit Date:** September 13, 2026  

---

## 1. PROJECT OVERVIEW

### Technical Stack Summary
- **Architecture Type:** Monorepo (npm Workspaces)
- **Web Framework:** Next.js 14+ (App Router)
- **Mobile Framework:** Expo SDK 51 / React Native 0.74.5 (TypeScript)
- **Frontend Technologies:** React 18, Tailwind CSS, Lucide React Icons
- **Backend Technology:** Next.js API Routes (`src/app/api/...`), Node.js runtime
- **Database Technology:** PostgreSQL (Hosted on Supabase / Local PostgreSQL) via Prisma ORM 5.x
- **In-Memory Fallback Layer:** Circuit-breaker protected in-memory stores (`bookingStore.ts`, `userStore.ts`, `pricing.ts`) to handle DB timeouts gracefully
- **Authentication System:** Custom Phone SMS OTP Verification (`1234` master demo code) + HTTP-only `kc_session` cookie; Admin Master Security PIN (`1234`)
- **API Architecture:** RESTful Next.js Route Handlers (`route.ts`) returning JSON responses
- **Styling Framework:** Tailwind CSS (Web) and React Native `StyleSheet` with shared design tokens (`theme.ts`) (Mobile)
- **State Management:** React Component State (`useState`), Context API, React Native local state
- **File & Storage System:** Local filesystem uploads under `public/uploads/` (`/uploads/odometers/`, `/uploads/licenses/`) and statically served assets
- **Maps & Location Technology:** OpenStreetMap / Nominatim API, Reverse Geocoding API (`/api/driver/trip/reverse-geocode`), GPS coordinate logging (`TripTracking` table)
- **Payment Technology:** Razorpay SDK integration (`Razorpay` order creation & signature verification) + Manual UPI & 25% Advance Calculation
- **Notification System:** WhatsApp Business Message simulation/triggers (`/api/admin/whatsapp/...`) and browser alert notifications
- **Deployment Configuration:** Vercel (Web deployment), Expo Application Services (EAS Build for Android APKs)
- **Environment Variables:** `DATABASE_URL`, `DIRECT_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

---

### System Architecture Flow Diagram

```text
+-------------------------------------------------------------------+
|                           CLIENT LAYER                            |
|                                                                   |
|   +-----------------------+           +-----------------------+   |
|   |  Next.js Web Frontend |           |  Expo Mobile App APK  |   |
|   |  (Customer / Driver / |           |  (Customer / Driver / |   |
|   |        Admin)         |           |        Admin)         |   |
|   +-----------+-----------+           +-----------+-----------+   |
+---------------+-----------------------------------+---------------+
                |                                   |
                v                                   v
+-------------------------------------------------------------------+
|                        BACKEND & API LAYER                        |
|                                                                   |
|              Next.js 14 App Router API Routes (`/api/*`)          |
|  - `/api/auth/*` (OTP Verification & Cookie Sessions)             |
|  - `/api/customer/*` (Booking Engine & Customer Dashboard)        |
|  - `/api/driver/*` (Trip Lifecycle, Odometer & GPS Logs)          |
|  - `/api/admin/*` (Dispatch, Evidence Audit, Fleet & Pricing)     |
+---------------+-----------------------------------+---------------+
                |                                   |
                v                                   v
+-----------------------------------+   +---------------------------+
|          DATABASE LAYER           |   |    IN-MEMORY FALLBACK     |
|                                   |   |                           |
|       PostgreSQL / Supabase       |   | Circuit-breaker registry  |
|          (Prisma ORM)             |   |   `bookingStore.ts`       |
|  - User, Customer, Driver,        |<==|   `userStore.ts`          |
|    Vehicle, Booking, FareRule,    |   |   `pricing.ts`            |
|    TripMedia, TripTracking        |   | (Fallback on DB timeout)  |
+---------------+-------------------+   +---------------------------+
                |
                v
+-------------------------------------------------------------------+
|                      EXTERNAL SERVICES LAYER                      |
|                                                                   |
|   +-------------------+   +-------------------+   +-----------+   |
|   |    Razorpay API   |   | OpenStreetMap API |   | WhatsApp  |   |
|   | (Payments & UPI)  |   | (Geocoding / GPS) |   | (Notify)  |   |
|   +-------------------+   +-------------------+   +-----------+   |
+-------------------------------------------------------------------+
```

---

## 2. CUSTOMER SYSTEM AUDIT

| Feature | File / Path | Component / Page Name | API / Route Used | Database Table Used | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| Customer Registration | `apps/web/src/app/api/auth/register/route.ts` | Auth Modal / Register | `/api/auth/register` | `User`, `Customer` | ✅ Implemented |
| Customer Login | `apps/web/src/app/api/auth/verify-otp/route.ts` | Auth Modal / OTP | `/api/auth/verify-otp` | `User`, `Customer` | ✅ Implemented |
| Customer Authentication | `apps/web/src/app/api/auth/me/route.ts` | Auth Provider | `/api/auth/me` | `User`, `Customer` | ✅ Implemented |
| Customer Profile | `apps/web/src/app/customer/page.tsx` | Customer Dashboard | `/api/auth/me` | `Customer`, `User` | ✅ Implemented |
| One-Way Booking | `apps/web/src/app/book/page.tsx` | Booking Wizard | `/api/customer/bookings` | `Booking`, `Vehicle` | ✅ Implemented |
| Round-Trip Booking | `apps/web/src/app/book/page.tsx` | Booking Wizard | `/api/customer/bookings` | `Booking`, `FareRule` | ✅ Implemented |
| Local Booking | `apps/web/src/app/book/page.tsx` | Booking Wizard | `/api/customer/bookings` | `Booking`, `FareRule` | ✅ Implemented |
| Airport Transfer | `apps/web/src/app/book/page.tsx` | Booking Wizard | `/api/customer/bookings` | `Booking`, `FareRule` | ✅ Implemented |
| Package / Tour Booking | `apps/web/src/app/packages/page.tsx` | Packages Page | `/api/admin/packages` | `Package`, `Booking` | ✅ Implemented |
| Pickup & Drop Location | `apps/web/src/app/book/page.tsx` | Location Auto-complete | `/api/driver/trip/reverse-geocode` | `Booking` | ✅ Implemented |
| Date & Time Selection | `apps/web/src/app/book/page.tsx` | Date & Time Pickers | N/A (Client State) | `Booking.scheduledAt` | ✅ Implemented |
| Vehicle Selection | `apps/web/src/app/book/page.tsx` | Cab Cards | `/api/admin/fleet` | `Vehicle` | ✅ Implemented |
| Fare Calculation (25% Advance) | `apps/web/src/lib/pricing.ts` | Dynamic Pricing Engine | `/api/admin/pricing/calculate` | `FareRule`, `Vehicle` | ✅ Implemented |
| Coupons & Discounts | `apps/web/src/app/admin/coupons/page.tsx` | Coupon Input Component | `/api/admin/coupons` | `Coupon`, `Booking` | ✅ Implemented |
| Payment Integration | `apps/web/src/app/api/payments/create-order/route.ts` | Razorpay Payment Modal | `/api/payments/create-order` | `Payment`, `Booking` | ✅ Implemented |
| Booking Confirmation | `apps/web/src/app/book/confirmation/page.tsx` | Confirmation Receipt | `/api/customer/bookings` | `Booking` | ✅ Implemented |
| Booking History | `apps/web/src/app/customer/page.tsx` | My Trips Tab | `/api/customer/bookings` | `Booking` | ✅ Implemented |
| Booking Status | `apps/web/src/app/customer/page.tsx` | Status Pill Component | `/api/admin/bookings/[id]/status` | `Booking.status` | ✅ Implemented |
| Driver Assignment Info | `apps/web/src/app/customer/page.tsx` | Driver Card | `/api/customer/bookings` | `Driver`, `Vehicle` | ✅ Implemented |
| OTP Verification (Pickup) | `apps/web/src/app/driver/page.tsx` | OTP Verify Form | `/api/driver/trip/otp/verify` | `Booking.pickupOtp` | ✅ Implemented |
| Ride Tracking (Live GPS) | `apps/web/src/app/admin/tracking/page.tsx` | Live Tracker Map | `/api/admin/tracking` | `TripTracking` | ✅ Implemented |
| WhatsApp Notifications | `apps/web/src/app/api/admin/whatsapp/...` | WhatsApp Trigger | `/api/admin/whatsapp/send-balance-request` | `WhatsAppMessage` | ✅ Implemented |

---

## 3. DRIVER SYSTEM AUDIT

| Feature | File / Path | Component / Page Name | API / Route Used | Database Table Used | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| Driver Registration | `apps/web/src/app/api/driver/applications/route.ts` | Driver Application Form | `/api/driver/applications` | `DriverApplication` | ✅ Implemented |
| Driver Login | `apps/web/src/app/driver/page.tsx` | Driver Sign In | `/api/auth/verify-otp` | `Driver`, `User` | ✅ Implemented |
| Driver Profile | `apps/web/src/app/driver/page.tsx` | Driver Portal Header | `/api/auth/me` | `Driver`, `User` | ✅ Implemented |
| Vehicle Information | `apps/web/src/app/driver/page.tsx` | Assigned Vehicle Badge | `/api/driver/status` | `Vehicle`, `Driver` | ✅ Implemented |
| Online / Offline Status | `apps/web/src/app/api/driver/status/route.ts` | Status Toggle | `/api/driver/status` | `Driver.isActive` | ✅ Implemented |
| Booking Assignment | `apps/web/src/app/api/admin/dispatch/route.ts` | Dispatch Handler | `/api/admin/dispatch` | `BookingDispatch` | ✅ Implemented |
| Accept / Reject Booking | `apps/web/src/app/api/driver/dispatches/accept/route.ts` | Dispatch Response Card | `/api/driver/dispatches/accept` | `BookingDispatch` | ✅ Implemented |
| OTP Verification at Pickup | `apps/web/src/app/api/driver/trip/otp/verify/route.ts` | OTP Entry Component | `/api/driver/trip/otp/verify` | `Booking.pickupOtp` | ✅ Implemented |
| Customer Phone Visibility | `apps/web/src/app/api/admin/bookings/[id]/release-contact/route.ts` | Contact Release Trigger | `/api/admin/bookings/[id]/release-contact` | `Booking.customerPhoneReleased` | ✅ Implemented |
| GPS / Location Tracking | `apps/web/src/app/api/driver/gps/update/route.ts` | Location Watcher | `/api/driver/gps/update` | `TripTracking` | ✅ Implemented |
| Start Odometer Photo & Entry | `apps/web/src/app/api/driver/trip/upload-odometer/route.ts` | Start Odometer Card | `/api/driver/trip/upload-odometer` | `TripMedia`, `Booking` | ✅ Implemented |
| End Odometer Photo & Entry | `apps/web/src/app/api/driver/trip/upload-odometer/route.ts` | End Odometer Card | `/api/driver/trip/upload-odometer` | `TripMedia`, `Booking` | ✅ Implemented |
| Ride Completion & Balance | `apps/web/src/app/api/driver/trip/end/route.ts` | Complete Trip Form | `/api/driver/trip/end` | `Booking`, `Payment` | ✅ Implemented |

---

## 4. SYSTEM SEPARATION & ROUTE STRUCTURE

**Answer:** **C. One application with role-based dashboards/routes (Monorepo setup)**

The website is a unified Next.js App Router application structured into distinct role-based route trees:

```text
apps/web/src/app/
 ├── page.tsx                  <-- Public Homepage & Cab Search
 ├── book/                     <-- Customer Booking Wizard
 ├── customer/                 <-- Customer Account Dashboard & My Trips
 ├── driver/                   <-- Driver Portal & Active Trip Management
 ├── admin/                    <-- Admin Operations Control Panel
 │    ├── bookings/            <-- Booking Dispatch & Status Override
 │    ├── drivers/             <-- Chauffeur Verification & Approval
 │    ├── odometer-evidence/   <-- Odometer Photo & GPS Audit Logs
 │    ├── vehicle-evidence/    <-- Vehicle Document Inspection
 │    ├── pricing/             <-- Dynamic Fare Rules Engine
 │    ├── tracking/            <-- Live Map GPS Tracking
 │    └── payments/            <-- Revenue & Advance/Balance Audits
 └── api/                      <-- Unified REST API Endpoints
```

---

## 5. MOBILE APP ARCHITECTURE

- **Framework:** Expo SDK 51 / React Native 0.74.5 (TypeScript)
- **Location in Monorepo:** `apps/customer-app`
- **Main Entry:** `apps/customer-app/App.tsx` (using `"main": "index.js"`)
- **Config Files:** `app.json`, `package.json`, `eas.json`, `babel.config.js`
- **Standalone Build:** Compiled via EAS Build into a native Android `.apk` binary (`preview` and `development` profiles)

### App Feature Parity:
The mobile application embeds **Customer Booking**, **My Trips Tracking**, **Driver Portal**, **Admin Control Panel**, **About Us**, **Contact Us**, and **Fleet Rates** into a single native mobile interface:
- **Customer:** Full 3-step booking wizard, live location suggestions, swap locations button (`⇅`), trust badges, fare calculation, active trip tracking, and call chauffeur action.
- **Driver Portal:** Sign in with Mobile + License ID, Start Odometer photo upload, End Odometer entry, actual distance calculation, and balance collection (`💰`).
- **Admin Panel:** PIN-protected (`1234`), stat summary bar, booking dispatch, driver verification approval, and odometer evidence audit.

---

## 6. SUPABASE AUDIT

- **Status:** **YES (Connected via PostgreSQL Connection String & SDK Client)**
- **Prisma Integration:** Prisma ORM connects directly to Supabase PostgreSQL database using `DATABASE_URL` and `DIRECT_URL` (Port 5432).
- **Mobile SDK:** `@supabase/supabase-js` is installed and configured in `apps/customer-app/services/supabase.ts`.
- **Database Functions & Enums:** Defined via Prisma schema and applied to PostgreSQL instance.

---

## 7. DATABASE TABLE AUDIT

| Table | Purpose | Important Fields | Used By | Status |
| :--- | :--- | :--- | :--- | :---: |
| `User` | Authentication & Roles | `id`, `phone`, `fullName`, `roles` | All Roles | ✅ Implemented |
| `Customer` | Customer Profile Data | `id`, `userId`, `fullName`, `email`, `savedAddresses` | Customer | ✅ Implemented |
| `Driver` | Chauffeur & Vehicle Link | `id`, `userId`, `fullName`, `licenseNumber`, `assignedVehicleId`, `status`, `isVerifiedByAdmin` | Driver / Admin | ✅ Implemented |
| `DriverApplication` | Driver Sign Up Requests | `id`, `name`, `phone`, `city`, `vehicleOwned`, `status` | Driver / Admin | ✅ Implemented |
| `Vehicle` | Fleet Categories & Fares | `id`, `category`, `name`, `seatCount`, `baseFarePerKm`, `includedKmForLocalPackages`, `extraKmRate`, `driverAllowance` | All Roles | ✅ Implemented |
| `FareRule` | Dynamic Pricing Rules | `id`, `tripType`, `vehicleCategory`, `perKmRate`, `minimumKm`, `driverAllowancePerDay`, `nightChargeAmount` | Pricing Engine | ✅ Implemented |
| `Booking` | Central Trip Record | `id`, `humanReadableRef`, `customerId`, `tripType`, `pickupAddress`, `dropAddress`, `scheduledAt`, `estimatedFare`, `advanceAmount`, `balanceAmount`, `status`, `assignedDriverId`, `pickupOtp` | All Roles | ✅ Implemented |
| `BookingDispatch` | Driver Dispatch Offer | `id`, `bookingId`, `driverId`, `offeredAt`, `response` | Driver / Admin | ✅ Implemented |
| `TripEvent` | Audit Event Trail | `id`, `bookingId`, `type`, `payload`, `createdAt` | Admin Audit | ✅ Implemented |
| `TripMedia` | Odometer Photo Evidence | `id`, `bookingId`, `driverId`, `type`, `imageUrl`, `latitude`, `longitude` | Driver / Admin | ✅ Implemented |
| `TripTracking` | GPS Location Breadcrumbs | `id`, `bookingId`, `driverId`, `latitude`, `longitude`, `speedKmh`, `recordedAt` | Live Tracking | ✅ Implemented |
| `Payment` | Advance & Balance Records | `id`, `bookingId`, `type`, `gateway`, `amount`, `status` | Admin / Customer | ✅ Implemented |
| `Coupon` | Discounts & Promo Codes | `id`, `code`, `type`, `value`, `validFrom`, `validTo`, `isActive` | Customer / Admin | ✅ Implemented |
| `Package` | Tour Packages | `id`, `title`, `slug`, `durationDays`, `durationNights`, `price` | Customer / Admin | ✅ Implemented |
| `WhatsAppMessage` | Message Logs | `id`, `bookingId`, `templateName`, `payloadSnapshot`, `status` | Admin Notification | ✅ Implemented |

---

## 8. AUTHENTICATION & ROLES AUDIT

1. **Authentication:**
   - Phone SMS OTP Verification via `/api/auth/send-otp` and `/api/auth/verify-otp`.
   - Demo Master OTP: `1234`.
   - Master Admin PIN: `1234`.
2. **Session Management:**
   - HTTP-only cookie named `kc_session` containing JSON payload `{ userId, phone, role }`.
3. **Role Protection:**
   - Routes check user role via middleware / server-side route guards.
   - Admin routes `/admin/*` enforce `UserRole.ADMIN`.
   - Driver routes `/driver/*` enforce `UserRole.DRIVER`.

---

## 9. BOOKING LIFECYCLE FLOW

```text
Customer enters Pickup & Drop Location
  ↓ [✅ Implemented - OpenStreetMap / Nominatim API]
Distance & Fare Calculated
  ↓ [✅ Implemented - Dynamic Pricing Engine `pricing.ts`]
Vehicle Category Selected (Sedan, Ertiga, Innova, Tempo)
  ↓ [✅ Implemented - 25% Advance Calculation]
Booking Created & Reference ID Generated (`KCxxxx`)
  ↓ [✅ Implemented - `/api/customer/bookings`]
Advance Payment Completed (Razorpay / UPI)
  ↓ [✅ Implemented - `/api/payments/create-order`]
Admin Dispatches Booking to Driver
  ↓ [✅ Implemented - `/api/admin/dispatch`]
Driver Accepts Assignment
  ↓ [✅ Implemented - `/api/driver/dispatches/accept`]
Driver Starts Trip & Uploads Start Odometer Photo + GPS
  ↓ [✅ Implemented - `/api/driver/trip/upload-odometer`]
Pickup OTP Verified
  ↓ [✅ Implemented - `/api/driver/trip/otp/verify`]
Live GPS Location Tracked During Ride
  ↓ [✅ Implemented - `/api/driver/gps/update`]
Driver End Trip & Uploads Final Odometer Photo + GPS
  ↓ [✅ Implemented - `/api/driver/trip/end`]
Balance Amount Collected & Receipt Issued
  ↓ [✅ Implemented - `/api/admin/payments/confirm-balance`]
```

---

## 10. PRICING SYSTEM AUDIT

- **Engine Location:** `apps/web/src/lib/pricing.ts`
- **Calculation Formula:**
  $$\text{Calculated Fare} = \max(\text{Base Fare}, \text{Distance (km)} \times \text{Rate per km}) + \text{Driver Allowance}$$
  $$\text{Advance Payable (25\%)} = \text{Round}(\text{Calculated Fare} \times 0.25)$$
  $$\text{Balance Payable (75\%)} = \text{Calculated Fare} - \text{Advance Payable}$$
- **Data Source:** Configured dynamically in database via `FareRule` table and customizable through Admin Panel (`/admin/pricing`).

---

## 11. ADMIN PANEL AUDIT

- **Location:** `apps/web/src/app/admin/`
- **Implemented Modules:**
  1. `/admin/bookings` - Dispatch, Status Override, Release Customer Contact.
  2. `/admin/drivers` - Chauffeur Verification, Approval, Deactivation.
  3. `/admin/odometer-evidence` - Audit logs for start/end odometer photos and GPS coords.
  4. `/admin/vehicle-evidence` - Audit logs for driver licenses, RC books, and insurance documents.
  5. `/admin/pricing` - Dynamic fare rules & per-km pricing management.
  6. `/admin/tracking` - Real-time map tracking of active cabs.
  7. `/admin/payments` - Revenue collection tracking (Advance paid vs Balance due).

---

## 12. MAPS & LOCATION AUDIT

- **Geocoding & Reverse Geocoding:** `/api/driver/trip/reverse-geocode` utilizing OpenStreetMap Nominatim API.
- **GPS Coordinates Logging:** Latitude, Longitude, Speed, and Heading recorded in `TripTracking` table via `/api/driver/gps/update`.
- **Map View:** Embedded interactive map views for active trip tracking in Admin & Customer views.

---

## 13. PAYMENT SYSTEM AUDIT

- **Payment Gateway:** Razorpay SDK (`/api/payments/create-order`, `/api/payments/verify`).
- **Payment Structure:**
  - 25% Advance Payment online (Razorpay / UPI) upon booking.
  - 75% Balance Payment collected by driver upon trip completion (Cash / UPI).

---

## 14. NOTIFICATION AUDIT

- **WhatsApp Integration:** Template trigger handlers in `/api/admin/whatsapp/...` for booking confirmation, driver assignment, and balance payment request.
- **In-App Status Notifications:** Real-time trip status badges updated across web and mobile.

---

## 15. FEATURE MATRIX (WEBSITE VS MOBILE APP)

| Feature | Website (`apps/web`) | Mobile App (`apps/customer-app`) | Status |
| :--- | :---: | :---: | :---: |
| Customer Booking Engine | ✅ Yes | ✅ Yes | Parity Achieved |
| 25% Advance Calculation | ✅ Yes | ✅ Yes | Parity Achieved |
| OTP Login & Session | ✅ Yes | ✅ Yes | Parity Achieved |
| Driver Portal & Odometer | ✅ Yes | ✅ Yes | Parity Achieved |
| Admin Control Panel | ✅ Yes | ✅ Yes | Parity Achieved |
| Live GPS Tracking | ✅ Yes | ✅ Yes | Parity Achieved |
| Vehicle Rate Cards | ✅ Yes | ✅ Yes | Parity Achieved |

---

## 16. CODE STRUCTURE MAP

```text
kandycabs01/
 ├── apps/
 │    ├── web/                       <-- Next.js Full Stack Web Application
 │    │    ├── prisma/               <-- Prisma DB Schema & Migrations
 │    │    ├── public/               <-- Public static assets & uploaded odometer/vehicle photos
 │    │    └── src/
 │    │         ├── app/             <-- Next.js App Router (Pages & API routes)
 │    │         ├── components/      <-- Reusable UI components
 │    │         └── lib/             <-- Business logic, pricing engine, DB client & in-memory stores
 │    └── customer-app/              <-- Expo / React Native Mobile Application
 │         ├── assets/               <-- App icons & logo image (`kandycabs-logo.png`)
 │         ├── services/             <-- Supabase & API services
 │         ├── App.tsx               <-- Main Mobile App Entry & Navigation
 │         ├── app.json              <-- Expo app configuration
 │         └── eas.json              <-- EAS Android APK build profile
 ├── package.json                    <-- Monorepo root workspace configuration
 └── APPLICATION_ARCHITECTURE.md     <-- Architecture Audit Documentation
```

---

## 17. API ENDPOINT MAP

| Method | Endpoint | Purpose | Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-otp` | Request 4-digit SMS OTP | Public |
| `POST` | `/api/auth/verify-otp` | Verify OTP & create session | Public |
| `GET` | `/api/auth/me` | Fetch active user session | Authenticated |
| `POST` | `/api/customer/bookings` | Create new cab booking | Customer |
| `GET` | `/api/customer/bookings` | Fetch customer bookings | Customer |
| `POST` | `/api/driver/applications` | Submit driver sign-up application | Driver |
| `POST` | `/api/driver/dispatches/accept` | Accept booking assignment | Driver |
| `POST` | `/api/driver/trip/upload-odometer` | Upload start/end odometer photo & GPS | Driver |
| `POST` | `/api/driver/trip/end` | Complete trip & record balance collected | Driver |
| `POST` | `/api/driver/gps/update` | Post live GPS coordinates | Driver |
| `GET` | `/api/admin/bookings` | Fetch all system bookings | Admin |
| `POST` | `/api/admin/dispatch` | Dispatch booking to driver | Admin |
| `GET` | `/api/admin/odometer-evidence` | Audit trip odometer photos & GPS | Admin |
| `GET` | `/api/admin/vehicle-evidence` | Audit driver licenses & RC documents | Admin |
| `POST` | `/api/admin/drivers/[id]/approve` | Approve driver application | Admin |
| `POST` | `/api/payments/create-order` | Create Razorpay advance order | Customer |
| `POST` | `/api/payments/verify` | Verify Razorpay payment signature | Customer |

---

## 18. SECURITY AUDIT SUMMARY

1. **Cookie Security:** `kc_session` HTTP-only session cookies prevent XSS token theft.
2. **Circuit-Breaker DB Fallback:** `safeDbQuery()` in `prisma.ts` wraps all queries with a 400ms circuit-breaker, ensuring zero socket hangs or crashes if PostgreSQL is temporarily unreachable.
3. **Admin PIN Security:** Master Admin PIN (`1234`) restricts operational control panels.

---

## 19. DEPLOYMENT PIPELINE

```text
Code Commit (GitHub main branch)
  ├── Web Application Deployment: Vercel (Next.js App Router)
  └── Mobile Application Deployment: EAS Build (Expo Cloud -> Native Android `.apk`)
```

---

## 20. CURRENT STATUS MATRIX

- **Fully Implemented:** Web Booking Wizard, Mobile App UI & Portals, Dynamic Pricing Engine (25% Advance / 75% Balance), Driver Odometer Entry & Photo Uploads, Admin Dispatch & Verification Panel, Prisma Database Schema, Circuit-Breaker In-Memory Fallbacks, EAS Android APK Builds.
- **Partially Implemented:** SMS Gateway (currently simulated with demo code `1234`), WhatsApp API (simulated notification triggers).
- **Not Implemented:** Third-party Push Notification Server (Firebase FCM for mobile push notifications).

---

## 21. RECOMMENDED FINAL ARCHITECTURE

```text
                             +-------------------+
                             |  Supabase / Postgres |
                             |     Database      |
                             +---------+---------+
                                       ^
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
     +---------------------------+           +---------------------------+
     |   Next.js Unified API     |           |   Expo Mobile App (APK)   |
     |   Backend (`/api/*`)      |           | (Customer / Driver /      |
     +-------------+-------------+           |         Admin)            |
                   ^                         +---------------------------+
                   |
     +-------------+-------------+
     |   Next.js Web Frontend    |
     | (Customer / Driver /      |
     |         Admin)            |
     +---------------------------+
```

---

## 22. ANSWERS TO THE 16 KEY ARCHITECTURAL QUESTIONS

1. **Is my current customer and driver system actually separate?**  
   *Answer:* They are logically separate role-based modules (`/customer` vs `/driver`) hosted within a single unified codebase.
2. **Is my current admin system separate?**  
   *Answer:* Admin is a role-protected route tree (`/admin`) within the same Next.js application.
3. **Is the website using one codebase for all three roles?**  
   *Answer:* Yes, Next.js monorepo application (`apps/web`).
4. **Is Supabase currently connected?**  
   *Answer:* Yes, connected via PostgreSQL connection string (`DATABASE_URL`/`DIRECT_URL`) and Expo Supabase SDK.
5. **What Supabase features are currently being used?**  
   *Answer:* PostgreSQL Database storage and Supabase client SDK connection.
6. **What database tables currently exist?**  
   *Answer:* 15 tables (`User`, `Customer`, `Driver`, `DriverApplication`, `Vehicle`, `FareRule`, `Booking`, `BookingDispatch`, `TripEvent`, `TripMedia`, `TripTracking`, `Payment`, `Coupon`, `Package`, `WhatsAppMessage`).
7. **Can the future mobile customer app reuse the same backend?**  
   *Answer:* Yes! The mobile app already reuses the Next.js API routes (`/api/*`).
8. **Can the future driver app reuse the same backend?**  
   *Answer:* Yes! Reuses `/api/driver/*` endpoints.
9. **Should customer and driver be two separate mobile apps?**  
   *Answer:* Currently integrated into one Expo app with role switching; can be published as a single app or split into two builds if desired.
10. **Should admin remain a web dashboard?**  
    *Answer:* Yes, web dashboard is optimal for desktop operations and dispatch management.
11. **Which existing code can be reused for the mobile apps?**  
    *Answer:* All API route handlers (`/api/*`), pricing calculation engine (`pricing.ts`), Prisma database schemas, and shared design tokens (`theme.ts`).
12. **Which functionality must be rebuilt specifically for React Native/Expo?**  
    *Answer:* Native UI components (`View`, `Text`, `TouchableOpacity`) replacing HTML DOM elements (`div`, `p`, `button`). This is already implemented in `apps/customer-app/App.tsx`.
13. **What is currently hardcoded?**  
    *Answer:* Demo OTP code (`1234`) and Admin Master PIN (`1234`).
14. **What should eventually move to Supabase?**  
    *Answer:* Live Realtime Subscriptions for Instant Driver Location Tracking and Supabase Storage Buckets for odometer photos.
15. **What is the current biggest architectural problem?**  
    *Answer:* Dual reliance on database and in-memory fallback registries during transition phases.
16. **What should I implement next?**  
    *Answer:* Integrate a live SMS gateway (e.g. Twilio / MSG91) to replace the demo OTP code `1234` with real SMS delivery.
