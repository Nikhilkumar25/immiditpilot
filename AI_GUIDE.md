# IMMIDIT - Home Nursing & Immediate Care Platform
## AI Context Guide

### 1. Project Overview
IMMIDIT is a web-based platform for booking home nursing services and immediate medical care. It connects patients with nurses and doctors for at-home treatments, general checkups, and emergency "SOS" services.

**Core Value Proposition:**
- **Scheduled Visits:** Book nurses/doctors for specific time slots.
- **Immediate Service (SOS):** Request a nurse immediately (target: <30 mins arrival).
- **Address Management:** Save and manage multiple service locations.

### 2. Technology Stack
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide React (Icons), React Leaflet (Maps).
- **Backend:** Node.js, Express.js.
- **Database:** PostgreSQL (with Prisma ORM).
- **Authentication:** Custom JWT-based auth (Middleware: `auth.ts`).
- **State Management:** React Context (`AuthContext`, `SOSContext`).

### 3. Key Workflows & Features

#### A. Authentication
- **Roles:** `patient`, `nurse`, `doctor`, `admin`.
- **Flow:** Login page -> JWT Token -> Stored in LocalStorage -> Protected Routes.
- **Test Credentials:**
  - Patient: `patient@immidit.com` / `password123`
  - Nurse: `nurse@immidit.com` / `password123`

#### B. Booking Flow (`BookVisit.tsx`)
1. **Service Selection:** Users select from services like "General Checkup", "Physiotherapy".
2. **Address Selection:**
   - **Map Integration:** Uses `react-leaflet`.
   - **Manual Fallback:** If map fails or user chooses, they can enter address manually (Flat, Building, etc.).
   - **Saving:** Addresses are saved to `SavedAddress` table via `POST /api/addresses`.
3. **Scheduling:**
   - **Standard:** Select Date & Time (20-min slots).
   - **Immediate:** Toggle "Immediate Service" -> Sets time to `NOW` + standard generic ETA.
4. **Confirmation:** Creates a `ServiceRequest` in the database.

#### C. Dashboard
- **Patient:** View active/upcoming bookings, booking history.
- **Nurse:** Accept/Reject incoming requests, navigation, status updates.

### 4. Database Schema (Prisma)
Key models in `schema.prisma`:
- `User`: Stores auth & profile info.
- `ServiceRequest`: The core booking unit. Links `patient`, `nurse`, `address`.
- `SavedAddress`: Detailed address info (`flatNumber`, `buildingName`, `lat`, `lng`, etc.).
- `ClinicalReport` / `LabOrder`: Medical records linked to requests.

### 5. Recent Critical Changes (as of Feb 2026)
- **Address Management:**
  - Added `SavedAddress` model with detailed fields (`flatNumber`, `floor`, `landmark`).
  - **Fix:** Added manual address entry fallback when Map component fails.
  - **Fix:** Resolved 500 error in `saveAddress` by updating `flatNumber` column in DB via migration `refine_address_and_service`.
- **Immediate Service:** added `isImmediate` flag to `ServiceRequest`.

### 6. Setup & Run Instructions
```bash
# Backend
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend
cd client
npm install
npm run dev
```

### 7. Known Nuances for Future Devs
- **Map Component:** `AddressMap.tsx` is wrapped in an `ErrorBoundary` because `react-leaflet` can be unstable in some environments.
- **Geolocation:** Browser geolocation API is used; ensure testing environment supports it or handle denials gracefully.
- **Validation:** Backend `addressController` has default fallbacks for `lat`/`lng` to prevent crashes if frontend sends nulls during manual entry.
