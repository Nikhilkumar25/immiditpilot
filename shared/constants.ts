import { ServiceStatus, LabOrderStatus, UserRole } from './types';

// Valid status transitions for service requests
export const SERVICE_STATUS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
    [ServiceStatus.PENDING_NURSE_ASSIGNMENT]: [ServiceStatus.NURSE_ASSIGNED, ServiceStatus.CANCELLED],
    [ServiceStatus.NURSE_ASSIGNED]: [ServiceStatus.NURSE_ON_THE_WAY, ServiceStatus.CANCELLED],
    [ServiceStatus.NURSE_ON_THE_WAY]: [ServiceStatus.VITALS_RECORDED, ServiceStatus.CANCELLED],
    [ServiceStatus.VITALS_RECORDED]: [ServiceStatus.AWAITING_DOCTOR_REVIEW, ServiceStatus.AWAITING_DOCTOR_APPROVAL, ServiceStatus.CANCELLED],
    [ServiceStatus.AWAITING_DOCTOR_REVIEW]: [ServiceStatus.DOCTOR_COMPLETED, ServiceStatus.CANCELLED],
    [ServiceStatus.AWAITING_DOCTOR_APPROVAL]: [ServiceStatus.DOCTOR_COMPLETED, ServiceStatus.CANCELLED],
    [ServiceStatus.DOCTOR_COMPLETED]: [ServiceStatus.COMPLETED, ServiceStatus.CANCELLED],
    [ServiceStatus.COMPLETED]: [],
    [ServiceStatus.CANCELLED]: [],
};

// Who can perform each status transition
export const STATUS_TRANSITION_ROLES: Record<string, UserRole[]> = {
    [`${ServiceStatus.PENDING_NURSE_ASSIGNMENT}->${ServiceStatus.NURSE_ASSIGNED}`]: [UserRole.ADMIN],
    [`${ServiceStatus.NURSE_ASSIGNED}->${ServiceStatus.NURSE_ON_THE_WAY}`]: [UserRole.NURSE],
    [`${ServiceStatus.NURSE_ON_THE_WAY}->${ServiceStatus.VITALS_RECORDED}`]: [UserRole.NURSE],
    [`${ServiceStatus.VITALS_RECORDED}->${ServiceStatus.AWAITING_DOCTOR_REVIEW}`]: [UserRole.NURSE],
    [`${ServiceStatus.VITALS_RECORDED}->${ServiceStatus.AWAITING_DOCTOR_APPROVAL}`]: [UserRole.NURSE],
    [`${ServiceStatus.AWAITING_DOCTOR_REVIEW}->${ServiceStatus.DOCTOR_COMPLETED}`]: [UserRole.DOCTOR],
    [`${ServiceStatus.AWAITING_DOCTOR_APPROVAL}->${ServiceStatus.DOCTOR_COMPLETED}`]: [UserRole.DOCTOR],
    [`${ServiceStatus.DOCTOR_COMPLETED}->${ServiceStatus.COMPLETED}`]: [UserRole.ADMIN, UserRole.DOCTOR],
};

// Valid lab order status transitions
export const LAB_STATUS_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
    [LabOrderStatus.PENDING_PATIENT_CONFIRMATION]: [LabOrderStatus.PENDING_SAMPLE_COLLECTION, LabOrderStatus.LAB_CLOSED],
    [LabOrderStatus.PENDING_SAMPLE_COLLECTION]: [LabOrderStatus.SAMPLE_COLLECTION_SCHEDULED],
    [LabOrderStatus.SAMPLE_COLLECTION_SCHEDULED]: [LabOrderStatus.SAMPLE_COLLECTED],
    [LabOrderStatus.SAMPLE_COLLECTED]: [LabOrderStatus.SENT_TO_LAB],
    [LabOrderStatus.SENT_TO_LAB]: [LabOrderStatus.REPORT_READY],
    [LabOrderStatus.REPORT_READY]: [LabOrderStatus.DOCTOR_REVIEW_PENDING],
    [LabOrderStatus.DOCTOR_REVIEW_PENDING]: [LabOrderStatus.LAB_CLOSED],
    [LabOrderStatus.LAB_CLOSED]: [],
};

// Service types available
export const SERVICE_TYPES = [
    'General Checkup',
    'Vitals Monitoring',
    'Wound Dressing',
    'IV Therapy',
    'Injection',
    'Post-Operative Care',
    'Elderly Care',
    'Pediatric Nursing',
    'Catheter Care',
    'Emergency Assessment',
];

// Triage colors
export const TRIAGE_COLORS = {
    mild: '#22C55E',
    moderate: '#F59E0B',
    severe: '#EF4444',
} as const;
