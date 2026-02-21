// ============ ENUMS ============

export enum UserRole {
  PATIENT = 'patient',
  NURSE = 'nurse',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum ServiceStatus {
  PENDING_NURSE_ASSIGNMENT = 'pending_nurse_assignment',
  NURSE_ASSIGNED = 'nurse_assigned',
  NURSE_ON_THE_WAY = 'nurse_on_the_way',
  VITALS_RECORDED = 'vitals_recorded',
  AWAITING_DOCTOR_REVIEW = 'awaiting_doctor_review',
  AWAITING_DOCTOR_APPROVAL = 'awaiting_doctor_approval',
  DOCTOR_COMPLETED = 'doctor_completed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum LabOrderStatus {
  PENDING_PATIENT_CONFIRMATION = 'pending_patient_confirmation',
  PENDING_SAMPLE_COLLECTION = 'pending_sample_collection',
  SAMPLE_COLLECTION_SCHEDULED = 'sample_collection_scheduled',
  SAMPLE_COLLECTED = 'sample_collected',
  SENT_TO_LAB = 'sent_to_lab',
  REPORT_READY = 'report_ready',
  DOCTOR_REVIEW_PENDING = 'doctor_review_pending',
  LAB_CLOSED = 'lab_closed',
}

export enum TriageLevel {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
}

// ============ USER ============

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  medicalRegNo?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  bloodGroup?: string;
  allergicInfo?: string;
  medicalHistory?: string;
  emergencyContact?: string;
  createdAt: string;
}

// ============ SERVICE REQUEST ============

export interface ServiceRequest {
  id: string;
  patientId: string;
  nurseId: string | null;
  doctorId: string | null;
  serviceType: string;
  symptoms: string;
  location: string;
  status: ServiceStatus;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
  patient?: User;
  nurse?: User;
  doctor?: User;
  clinicalReport?: ClinicalReport;
  doctorAction?: DoctorAction;
  prescriptions?: Prescription[];
  followUpTasks?: FollowUpTask[];
}

// ============ CLINICAL REPORT ============

export interface Vitals {
  bloodPressure: string;
  pulse: string;
  temperature: string;
  spO2: string;
  weight: string;
  bloodSugar: string;
  respiratoryRate?: string;
  randomBloodSugar?: string;
  [key: string]: any; // Allow service-specific vitals
}

export interface ClinicalReport {
  id: string;
  serviceId: string;
  chiefComplaint: string | null;
  durationOfSymptoms: string | null;
  vitalsJson: Vitals;
  medicalHistory: string | null;
  allergies: string | null;
  currentMedications: string | null;
  nurseNotes: string;
  nurseObservations: string | null;
  attachments: string[];
  triageLevel: TriageLevel;
  createdAt: string;
}

// ============ DOCTOR ACTION ============

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;  // e.g. "1-0-1"
  durationDays: number;
  timing: 'Before Food' | 'After Food' | 'None';
  instructions: string;
}

export interface DoctorAction {
  id: string;
  serviceId: string;
  diagnosis: string;
  clinicalNotes: string | null;
  advice: string | null;
  medications: string | null;
  medicinesJson: Medicine[] | null;
  prescriptionUrl: string | null;
  labRecommended: boolean;
  referralNote: string | null;
  followupDate: string | null;
  followupInstruction: string | null;
  procedureApproved: boolean;
  approvalNotes: string | null;
  requestNurseEdit: boolean;
  createdAt: string;
}

// ============ PRESCRIPTION ============

export interface Prescription {
  id: string;
  serviceId: string;
  doctorId: string;
  patientId: string;
  clinicalReportId: string;
  diagnosis: string;
  summaryNotes: string | null;
  vitalsSnapshotJson: Vitals;
  nurseObservations: string | null;
  medicinesJson: Medicine[];
  followUpInstruction: string | null;
  pdfUrl: string | null;
  versionNumber: number;
  createdAt: string;
}

export interface PrescriptionVersion {
  id: string;
  prescriptionId: string;
  versionNumber: number;
  vitalsSnapshotJson: Vitals;
  nurseObservations: string | null;
  medicinesJson: Medicine[];
  diagnosis: string;
  summaryNotes: string | null;
  createdAt: string;
}

export interface FollowUpTask {
  id: string;
  serviceId: string;
  patientId: string;
  prescriptionId: string | null;
  instruction: string;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

// ============ LAB ============

export interface LabOrder {
  id: string;
  serviceId: string;
  patientId: string;
  doctorId: string;
  testsJson: LabTest[];
  urgency: string;
  status: LabOrderStatus;
  collectionTime: string | null;
  createdAt: string;
  patient?: User;
  doctor?: User;
  labReport?: LabReport;
}

export interface LabTest {
  name: string;
  code: string;
}

export interface LabReport {
  id: string;
  labOrderId: string;
  reportUrl: string;
  doctorReviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ============ USE CASE ============

export interface UseCase {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  themeColor: string;
  backgroundGradient: string | null;
  ctaText: string;
  ctaAction: string;
  illustrationUrl: string | null;
  order: number;
  active: boolean;
}

// ============ AUDIT ============

export interface AuditLog {
  id: string;
  userId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}

// ============ API TYPES ============

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateServiceRequest {
  serviceType: string;
  symptoms: string;
  location: string;
  scheduledTime: string;
}

export interface SubmitVitalsRequest {
  vitalsJson: Vitals;
  nurseNotes: string;
  triageLevel: TriageLevel;
  chiefComplaint?: string;
  durationOfSymptoms?: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  nurseObservations?: string;
}

export interface SubmitDoctorActionRequest {
  diagnosis: string;
  clinicalNotes?: string;
  advice?: string;
  medications?: string;
  medicinesJson?: Medicine[];
  prescriptionUrl?: string;
  labRecommended: boolean;
  referralNote?: string;
  followupDate?: string;
  followupInstruction?: string;
}

export interface GeneratePrescriptionRequest {
  diagnosis: string;
  summaryNotes?: string;
  medicinesJson: Medicine[];
  followUpInstruction?: string;
}

export interface CreateLabOrderRequest {
  serviceId: string;
  patientId: string;
  testsJson: LabTest[];
  urgency: string;
}

// ============ SOCKET EVENTS ============

export enum SocketEvent {
  NEW_SERVICE_REQUEST = 'new_service_request',
  NURSE_ASSIGNED = 'nurse_assigned',
  NURSE_STARTED_VISIT = 'nurse_started_visit',
  VITALS_SUBMITTED = 'vitals_submitted',
  DOCTOR_REVIEW_STARTED = 'doctor_review_started',
  PRESCRIPTION_UPLOADED = 'prescription_uploaded',
  LAB_ORDER_CREATED = 'lab_order_created',
  REPORT_UPLOADED = 'report_uploaded',
  CASE_COMPLETED = 'case_completed',
  STATUS_UPDATE = 'status_update',
}
