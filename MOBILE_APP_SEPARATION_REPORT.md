# KANDY CABS — MOBILE APPLICATION SEPARATION REPORT

**Project:** Kandy Cabs Intercity & Outstation Cab Platform  
**Date:** September 13, 2026  
**Architecture Migration:** Split monolithic mobile application into dedicated **Customer** and **Driver** Expo applications.

---

## 1. EXECUTIVE SUMMARY & TARGET ARCHITECTURE

The mobile application codebase has been successfully separated into two distinct, standalone Expo / React Native applications while preserving the centralized Next.js Web Control Panel and single PostgreSQL/Supabase database backend.

```text
                    ┌──────────────────────────┐
                    │   Supabase PostgreSQL    │
                    └────────────┬─────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │  Next.js Unified Backend  │
                   │    (apps/web/src/app/api) │
                   └─────────────┬─────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────┴─────────┐   ┌─────────┴────────┐   ┌──────────┴─────────┐
│ Customer Mobile  │   │  Driver Mobile   │   │ Web Admin Control  │
│  (Expo / RN App) │   │ (Expo / RN App)  │   │ (Next.js Dashboard)│
│  com.kandycabs.  │   │  com.kandycabs.  │   │  apps/web/src/app/ │
│     customer     │   │      driver      │   │        admin       │
└──────────────────┘   └──────────────────┘   └────────────────────┘
```

### Strategic Key Design Decisions:
1. **Zero Database Duplication:** Both apps communicate with the exact same Supabase database through `EXPO_PUBLIC_API_URL` hitting `apps/web/src/app/api`.
2. **Clean Package Separation:** `com.kandycabs.customer` and `com.kandycabs.driver` are independent Android package identifiers, allowing both apps to be installed simultaneously on the same device.
3. **Role Gating & Security:** Customer App contains zero Driver or Admin UI code/state. Driver App contains focused Chauffeur trip management, hardware permission gating (Camera + GPS), and trip completion tools.

---

## 2. APPLICATION AUDIT & SPECIFICATIONS

### 📱 A. CUSTOMER MOBILE APP (`apps/customer-app`)
* **Package Identifier:** `com.kandycabs.customer`
* **App Name:** `Kandy Cabs Customer`
* **Expo Slug:** `kandy-cabs-customer`
* **Main Entry:** `App.tsx`
* **Key Functionality:**
  - Route Selection & Location Auto-complete (Popular South Indian & Sri Lankan hubs: Bangalore, Coorg, Mysore, Mangalore, Colombo, Kandy).
  - Vehicle Category Selection (Sedan Dzire, SUV Ertiga, Executive Innova Crysta, Tempo Traveller).
  - Transparent 25% Advance Calculation & Fare Rules Engine.
  - Side Drawer & Bottom Tab Navigation for Home, Fleet & Rates, About Us, Contact Us, and My Account.
  - SMS OTP Customer Sign In.
  - Customer Booking History & Live Trip Status tracking.

---

### 🚚 B. DRIVER MOBILE APP (`apps/driver-app`)
* **Package Identifier:** `com.kandycabs.driver`
* **App Name:** `Kandy Cabs Driver`
* **Expo Slug:** `kandy-cabs-driver`
* **Main Entry:** `App.tsx`
* **Hardware Permissions Configured (`app.json` & Android Manifest):**
  - `CAMERA` (Required for taking timestamped start/end odometer photos)
  - `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION` (GPS tracking & coordinate stamping)
  - `ACCESS_BACKGROUND_LOCATION` (Continuous 5-second location ping loop during active trips)
* **Key Functionality:**
  - Chauffeur Sign In (Registered Mobile + Driving License ID).
  - Hardware Permission Status Checks & Live Gating Alerts.
  - **4-Step Gated Trip Workflow:**
    1. **Pickup Arrival & OTP Verification:** Requires 4-digit customer OTP to unlock trip start.
    2. **Start Odometer & Cleanliness Stamp:** Camera & GPS gated photo capture of initial odometer.
    3. **Toll Fare Entry & Confirmation:** Toll fare input gating that prevents trip closeout until confirmed.
    4. **End Odometer & Trip Close-out:** Final odometer photo + GPS stamp, auto-calculates driven distance, and closes out balance collection.
  - Telemetry ping loop logging location & speed to `/api/driver/trips/[id]/ping` every 5 seconds.
  - Document status overview (Driving License, RC Book, Commercial Insurance).

---

### 🖥️ C. WEB ADMIN CONTROL PANEL (`apps/web`)
* **Framework:** Next.js 14 App Router
* **Access Path:** `/admin/*`
* **Key Modules:**
  - Operations Dashboard (`/admin`)
  - Driver & Vehicle Evidence Audit (`/admin/vehicle-evidence`)
  - Trip Start/End Odometer Lightbox Audit (`/admin/odometer-evidence`)
  - Revenue & Payment Status (`/admin/payments`)

---

## 3. BUILD & EAS DEPLOYMENT CONFIGURATION

Both applications include dedicated `eas.json` profiles ready for EAS Build CLI generation into APKs:

```json
{
  "cli": {
    "version": ">= 9.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

### Standalone APK Generation Commands:
* **Customer App APK:**
  ```bash
  cd apps/customer-app
  eas build --platform android --profile preview
  ```
* **Driver App APK:**
  ```bash
  cd apps/driver-app
  eas build --platform android --profile preview
  ```

---

## 4. VERIFICATION & TEST RESULTS

All applications across the monorepo were audited for TypeScript type safety and compilation integrity:

| Application Module | Target Directory | Compilation Command | Status | Errors |
| :--- | :--- | :--- | :--- | :--- |
| **Customer App** | `apps/customer-app` | `npx tsc --noEmit` | **PASSED** | `0 errors` |
| **Driver App** | `apps/driver-app` | `npx tsc --noEmit` | **PASSED** | `0 errors` |
| **Next.js Web** | `apps/web` | `npx tsc --noEmit` | **PASSED** | `0 errors` |

---

## 5. SUMMARY OF CHANGES & COMMITS

1. **Created `apps/driver-app` Workspace Component:**
   - Initialized `package.json` (`@kandycabs/driver-app`), `app.json` (`com.kandycabs.driver`), `eas.json`, `index.js`, `babel.config.js`, `tsconfig.json`, and `assets/`.
   - Built standalone `App.tsx` tailored strictly for Driver operations & hardware-gated trip execution.
2. **Refactored `apps/customer-app` Component:**
   - Updated `app.json` to package `com.kandycabs.customer`.
   - Stripped driver login forms, odometer entry controls, admin pin access, and role switching logic from `App.tsx`.
3. **Verified Workspace Workspace Compatibility:**
   - Root `package.json` workspace glob `"workspaces": ["apps/*", "packages/*"]` automatically manages both applications.
