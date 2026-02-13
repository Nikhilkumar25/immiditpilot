import { ServiceStatus as PrismaServiceStatus, LabOrderStatus as PrismaLabOrderStatus } from '@prisma/client';

// Valid transitions for service request status
const SERVICE_TRANSITIONS: Record<string, string[]> = {
    pending_nurse_assignment: ['nurse_assigned', 'cancelled'],
    nurse_assigned: ['nurse_on_the_way', 'cancelled'],
    nurse_on_the_way: ['vitals_recorded', 'cancelled'],
    vitals_recorded: ['awaiting_doctor_review', 'cancelled'],
    awaiting_doctor_review: ['doctor_completed', 'cancelled'],
    doctor_completed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
};

// Who can trigger each transition
const TRANSITION_ROLES: Record<string, string[]> = {
    'pending_nurse_assignment->nurse_assigned': ['admin'],
    'nurse_assigned->nurse_on_the_way': ['nurse'],
    'nurse_on_the_way->vitals_recorded': ['nurse'],
    'vitals_recorded->awaiting_doctor_review': ['nurse'],
    'awaiting_doctor_review->doctor_completed': ['doctor'],
    'doctor_completed->completed': ['admin', 'doctor'],
};

export function canTransitionService(
    current: string,
    next: string,
    role: string
): boolean {
    const allowed = SERVICE_TRANSITIONS[current];
    if (!allowed || !allowed.includes(next)) return false;

    // Cancellation can be done by admin or the original role
    if (next === 'cancelled' && role === 'admin') return true;

    const key = `${current}->${next}`;
    const roles = TRANSITION_ROLES[key];
    if (!roles) return false;
    return roles.includes(role);
}

// Valid transitions for lab order status
const LAB_TRANSITIONS: Record<string, string[]> = {
    pending_patient_confirmation: ['pending_sample_collection', 'lab_closed'],
    pending_sample_collection: ['sample_collection_scheduled'],
    sample_collection_scheduled: ['sample_collected'],
    sample_collected: ['sent_to_lab'],
    sent_to_lab: ['report_ready'],
    report_ready: ['doctor_review_pending'],
    doctor_review_pending: ['lab_closed'],
    lab_closed: [],
};

export function canTransitionLab(
    current: string,
    next: string
): boolean {
    const allowed = LAB_TRANSITIONS[current];
    if (!allowed) return false;
    return allowed.includes(next);
}

// Check if a service request has pending lab orders
export function hasLabPending(labOrders: { status: string }[]): boolean {
    return labOrders.some(lo => lo.status !== 'lab_closed');
}
