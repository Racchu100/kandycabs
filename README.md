# Kandy Cabs — Production Intercity Cab Booking Platform

Production-grade, error-free, fully responsive cab-booking platform called **Kandy Cabs** consisting of:
1. Public Marketing + Booking Engine (Next.js 14 App Router, TypeScript, Tailwind CSS)
2. Customer Portal with PDF Invoice Generator (`/customer/dashboard`)
3. Admin Master Console (`/admin/*`)
4. Driver Web Partner Dashboard (`/driver/dashboard`)
5. Customer Expo Mobile App (`apps/customer-app`)
6. Driver Expo Mobile App (`apps/driver-app`)

All surfaces share one **Supabase PostgreSQL database** via Prisma ORM and one unified API layer.

---

## Brand & Design Tokens

- **Primary Orange**: `#F26A21`
- **Ink Black**: `#15171C`
- **Background Gray**: `#F1F2F4`
- **Typography**: Inter (Body) + Plus Jakarta Sans (Headings)
- **Design Language**: Savaari-style card layout, segmented trip-type tabs, inline autocomplete fields, dark "estimated total" summary strip.

---

## Tech Stack & Architecture

| Layer | Technology |
|---|---|
| Website + Admin | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Customer mobile app | Expo + React Native (TypeScript) |
| Driver mobile app | Expo + React Native (TypeScript) |
| Database | Supabase PostgreSQL (16 Tables) |
| ORM | Prisma |
| Auth | 4-Digit SMS OTP + JWT Session (HTTP-only cookies on web, secure storage on app) |
| Payments | Razorpay (25% advance server-authoritative order + HMAC-SHA256 verification) |
| Storage | Supabase Storage (`fleet-photos` public, `driver-docs` private signed, `trip-media` private signed) |
| Maps | Google Maps Platform (Places Autocomplete + Directions API) |
| WhatsApp | Meta WhatsApp Cloud API (Template-based itinerary share & balance payment request) |
| Web Hosting | Vercel |
| Mobile Publishing | Expo EAS → Play Store + App Store |

---

## Key Business Logic & Technical Features

1. **25% Advance Online Payment**: Server-authoritative fare engine calculates estimated total; charges exactly 25% advance via Razorpay. Remaining 75% balance + tolls requested post-trip via Meta WhatsApp Cloud API with GPay/UPI scanner image and manually reconciled by Admin.
2. **First Driver to Accept Wins (Atomic Lock)**: Admin broadcasts dispatches to active drivers. Atomic database transaction (`UPDATE ... WHERE assignedDriverId IS NULL`) ensures the first driver to click accept acquires the booking; dispatches silently expire for everyone else.
3. **Contact Release Protection**: Customer phone numbers remain hidden from drivers until an admin explicitly toggles "Release Contact".
4. **Continuous Live GPS Tracking (§6a)**: Driver apps stream location pings every 5–10s to `trip_tracking`. Admin Live Map view displays animated marker, live speed (km/h), distance covered vs estimated, live ETA, driven route polyline, max-speed alert flags, and tracking lost warnings.
5. **GPS + Camera Gating Enforcement**: Odometer photo capture is programmatically disabled unless both active GPS location and camera permissions are live.

---

## Getting Started & Local Setup

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` in `apps/web`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"

NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"

JWT_SECRET="kandy_cabs_super_secret_jwt_key_2026"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="[YOUR-GOOGLE-MAPS-KEY]"

RAZORPAY_KEY_ID="[YOUR-RAZORPAY-KEY-ID]"
RAZORPAY_KEY_SECRET="[YOUR-RAZORPAY-SECRET]"

WHATSAPP_CLOUD_API_TOKEN="[YOUR-WHATSAPP-TOKEN]"
WHATSAPP_PHONE_NUMBER_ID="[YOUR-WHATSAPP-PHONE-ID]"
```

### 3. Database Migration & Seed
```bash
npm run db:generate
npx prisma db push --schema=apps/web/prisma/schema.prisma
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" apps/web/prisma/seed.ts
```

### 4. Run Web Application
```bash
npm run dev --workspace=apps/web
```
Open `http://localhost:3000` in your browser.

---

## Production Deployment & EAS Build

### Deploying Web App to Vercel
1. Connect GitHub repository to Vercel.
2. Set root directory to `apps/web`.
3. Add environment variables in Vercel project settings.
4. Deploy!

### Mobile Apps (Expo EAS Build)
```bash
# Customer App
cd apps/customer-app
eas build --platform all

# Driver App
cd apps/driver-app
eas build --platform all
```

---

## End-to-End Test Workflow Verification

1. **Customer Booking**: Navigate to `/booking` -> select One-way route -> select vehicle category -> apply coupon `KANDY100` -> test Razorpay 25% advance checkout -> verify booking `KC...` created in `PENDING_ADMIN` status.
2. **Admin Dispatch**: Open Admin Console `/admin/bookings` -> broadcast dispatch to active drivers -> accept from Driver Portal `/driver/dashboard` -> verify atomic lock.
3. **Arrival & OTP**: Driver marks "Arrived" -> enter pickup OTP -> verify `TRIP_STARTED` event.
4. **GPS + Camera Gated Odometer**: Toggle hardware switch -> capture start odometer photo with timestamp + GPS stamp.
5. **Live GPS Tracking (§6a)**: Open `/admin/tracking` -> observe live driver marker animation, speed gauge (km/h), distance progress, ETA, and driven route polyline.
6. **Tolls & Completion**: Log toll receipt -> capture end odometer photo -> mark trip completed.
7. **WhatsApp & Billing Closeout**: Admin triggers 1-click WhatsApp balance request -> manually confirms balance payment in Admin Console.
