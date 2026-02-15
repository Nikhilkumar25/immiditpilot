# IMMIDIT - Home Nursing & Immediate Care Platform
## AI Context Guide

### 1. Project Overview
IMMIDIT is a web-based platform for booking home nursing services and immediate medical care. It connects patients with nurses and doctors for at-home treatments, general checkups, and emergency "SOS" services.

**Core Value Proposition:**
- **Scheduled Visits:** Book nurses/doctors for specific 20-min time slots (8 AM–8 PM).
- **Immediate Service (SOS):** Request a nurse immediately (target: <30 mins arrival).
- **Address Management:** Save and manage multiple service locations.

### 2. Technology Stack
- **Frontend:** React (Vite), TypeScript, Vanilla CSS (Design System), Lucide React (Icons).
- **Backend:** Node.js, Express.js.
- **Database:** PostgreSQL (with Prisma ORM).
- **Authentication:** Custom JWT-based auth.
- **Real-time:** Socket.io for status updates and notification badges.

### 3. Key Workflows & Features

#### A. Authentication
- **Roles:** `patient`, `nurse`, `doctor`, `admin`, `lab`.
- **Flow:** Login page -> JWT Token -> Stored in LocalStorage -> Protected Routes.
- **Test Credentials:**
  - Patient: `patient@immidit.com` / `password123`
  - Nurse: `nurse@immidit.com` / `password123`

#### B. Booking Flow
- **Standard:** Select Date & Time in 20-min slots (8:00, 8:20, 8:40, ..., 19:40).
- **Server-side validation:** Rejects bookings outside 8 AM–8 PM or not on 20-min boundaries.
- **Immediate:** Toggle "Immediate Service" → Sets time to `NOW`, bypasses slot validation.
- **Cancellation:** Patients can cancel requests while status is `pending_nurse_assignment` or `nurse_assigned`.

#### C. Service Status State Machine
```
pending_nurse_assignment → nurse_assigned (admin)
nurse_assigned → nurse_on_the_way (nurse)
nurse_on_the_way → vitals_recorded (nurse)
vitals_recorded → awaiting_doctor_review (nurse)
awaiting_doctor_review → doctor_completed (doctor)
doctor_completed → completed (admin/doctor)
Any* → cancelled (admin)
```
*Except `completed` and `cancelled` which are terminal states.

#### D. Lab Order Status Machine
```
pending_patient_confirmation → pending_sample_collection → sample_collection_scheduled
→ sample_collected → sent_to_lab → report_ready → doctor_review_pending → lab_closed
```

#### E. Per-Service Workflow Configs (`serviceFlowConfig.ts`)
Each of the 10 service types has a flow definition specifying:
- `nurseFields`: Dynamic form fields (vitals + service-specific data like wound photos, prescription verification)
- `requiresVitals`, `requiresImages`, `minImages`: Input requirements
- `requiresPrescriptionVerification`: Whether nurse must verify prescription first
- `doctorMustAct`: Whether a doctor review is mandatory
- `isEmergency`, `skipQueue`, `alertDoctorImmediately`: Emergency routing flags
- `doctorReviewFields`: Fields the doctor must complete

**Service Types:** General Checkup, Vitals Monitoring, Wound Dressing, IV Therapy, Injection, Post-Operative Care, Elderly Care, Pediatric Nursing, Catheter Care, Emergency Assessment.

#### F. Dashboards & Roles
- **Patient Dashboard:** Tracker for active cases, visit history, lab reports (viewable once ready), cancel button.
- **Nurse Dashboard:** Assigned cases, **Navigation** (Google Maps deep link), vitals recording, dynamic fields per service type.
- **Doctor Dashboard:** Review vitals, diagnose, order labs, review uploaded reports.
- **Lab Dashboard:** Upload reports (PDF or images), manage sample collection queue.
- **Admin Dashboard:** KPIs, manual nurse assignment, audit logs, global case management.

#### G. Ratings
- Post-service ratings (1–5 stars) with optional category (`behavior`, `guidance`, `medical_skill`) and comment.
- Linked to `ServiceRequest`, from one user to another.

### 4. Database Schema (Prisma)
Key models in `schema.prisma`:
- `User`: Auth & profile info. Roles: patient, nurse, doctor, admin, lab.
- `ServiceRequest`: Core booking unit. Links `patient`, `nurse`, `doctor`, `savedAddress`. Has `isImmediate`, `serviceCategory`, `scheduledTime`, `scheduledEndTime`.
- `SavedAddress`: Structured address (`flatNumber`, `buildingName`, `floor`, `landmark`, `area`, `city`, `pincode`, `lat`, `lng`).
- `ClinicalReport`: Nurse-submitted vitals + notes + attachments + triage level.
- `DoctorAction`: Diagnosis, prescription, lab recommendation, follow-up date.
- `LabOrder` / `LabReport`: Lab lifecycle from order to report upload.
- `Rating`: Post-service ratings between users.
- `AuditLog`: Timestamped action logging.

### 5. Recent Critical Changes (Feb 2026)
- **Server-Side Slot Validation:** createServiceRequest now validates 20-min slot boundaries (8 AM–8 PM), skips for immediate bookings.
- **Booking Flow Fixed:** `addressId` integration, full payload validation, and immediate care toggle wiring.
- **File Uploads:** Expanded support for images (JPEG, PNG, WebP) up to 10MB alongside PDFs.
- **Nurse Navigation:** Destination coordinates and deep linking to Google Maps for all assignments.
- **Notification Badges:** Real-time sidebar badges for new assignments, reports, and status updates.
- **Cancellation:** Patient/admin can cancel bookings in early statuses.
- **Design System:** Standardized visual language using a centralized vanilla CSS system.

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
- **Design system:** Favor `var()` tokens and `.card`, `.btn`, `.badge` classes over utility-heavy Tailwind for new components.
- **Socket.io:** Rooms are used for role-based (`role:admin`, `role:lab`) and user-specific (`user:{id}`) events.
- **Service Flow Config:** Use `getFlowConfig(serviceType)` to get per-service validation rules. `NurseCaseView.tsx` uses `DynamicField` renderer for these.
- **Status Engine:** All transitions are validated server-side in `statusEngine.ts`. Check `TRANSITION_ROLES` for who can trigger each transition.
- **Verification:** Always test flows across multiple roles to verify real-time status transitions and notification badges.
