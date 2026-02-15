/**
 * Client-side Service Flow Configuration
 * Mirrors server-side serviceFlowConfig.ts for dynamic form rendering.
 */

export interface NurseFormField {
    field: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'image' | 'datetime' | 'textarea';
    required: boolean;
    options?: string[];
    minImages?: number;
    description?: string;
    group?: 'vitals' | 'service_specific';
}

export interface ServiceFlowUI {
    nurseFields: NurseFormField[];
    color: string;           // Badge / accent color
    icon: string;            // Emoji icon
    urgentSubmit: boolean;   // Red submit button for emergencies
    isEmergency: boolean;
    autoCloseInfo?: string;  // Message about auto-close if applicable
}

const BASE_VITALS: NurseFormField[] = [
    { field: 'bloodPressure', label: 'Blood Pressure', type: 'text', required: true, group: 'vitals' },
    { field: 'pulse', label: 'Pulse (bpm)', type: 'number', required: true, group: 'vitals' },
    { field: 'temperature', label: 'Temperature (°C)', type: 'number', required: true, group: 'vitals' },
    { field: 'spO2', label: 'SpO₂ (%)', type: 'number', required: true, group: 'vitals' },
];

export const SERVICE_FLOW_UI: Record<string, ServiceFlowUI> = {

    'General Checkup': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false, group: 'vitals' },
            { field: 'observations', label: 'Physical Observations', type: 'textarea', required: true, group: 'service_specific' },
        ],
        color: '#4A90D9',
        icon: '🩺',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Vitals Monitoring': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false, group: 'vitals' },
            { field: 'bloodSugar', label: 'Blood Sugar', type: 'number', required: false, group: 'vitals' },
            { field: 'previousComparison', label: 'Comparison with Previous Visit', type: 'textarea', required: false, group: 'service_specific' },
        ],
        color: '#50C878',
        icon: '📊',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Wound Dressing': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'woundPhotoBefore', label: 'Wound Photo (Before Dressing)', type: 'image', required: true, minImages: 1, group: 'service_specific', description: 'Take a clear photo of the wound before cleaning/dressing' },
            { field: 'woundPhotoAfter', label: 'Wound Photo (After Dressing)', type: 'image', required: true, minImages: 1, group: 'service_specific', description: 'Take a clear photo after applying the new dressing' },
            { field: 'healingStage', label: 'Healing Stage', type: 'select', required: true, options: ['inflammatory', 'proliferative', 'maturation', 'infected'], group: 'service_specific' },
            { field: 'dressingNotes', label: 'Dressing Notes', type: 'textarea', required: true, group: 'service_specific' },
        ],
        color: '#E67E22',
        icon: '🩹',
        urgentSubmit: false,
        isEmergency: false,
    },

    'IV Therapy': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'prescriptionVerified', label: 'Doctor Prescription Verified', type: 'boolean', required: true, group: 'service_specific', description: 'Confirm you have verified the doctor\'s prescription before starting' },
            { field: 'infusionStartTime', label: 'Infusion Start Time', type: 'datetime', required: true, group: 'service_specific' },
            { field: 'infusionEndTime', label: 'Infusion End Time', type: 'datetime', required: false, group: 'service_specific', description: 'Set when infusion is complete' },
            { field: 'infusionNotes', label: 'Infusion Notes', type: 'textarea', required: false, group: 'service_specific' },
        ],
        color: '#8E44AD',
        icon: '💉',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Injection': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'prescriptionVerified', label: 'Prescription Verified', type: 'boolean', required: true, group: 'service_specific', description: 'Confirm the injection matches the prescription' },
            { field: 'injectionAdministered', label: 'Injection Administered', type: 'boolean', required: true, group: 'service_specific' },
            { field: 'monitoringDuration', label: 'Monitoring Duration (mins)', type: 'number', required: true, group: 'service_specific', description: 'Monitor patient for at least 15 minutes after injection' },
            { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], group: 'service_specific' },
        ],
        color: '#27AE60',
        icon: '💊',
        urgentSubmit: false,
        isEmergency: false,
        autoCloseInfo: 'If reaction status is "none", the case will be auto-closed without requiring doctor review.',
    },

    'Post-Operative Care': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'surgicalSiteCheck', label: 'Surgical Site Assessment', type: 'textarea', required: true, group: 'service_specific', description: 'Describe the surgical site condition, signs of infection, drainage, etc.' },
            { field: 'painLevel', label: 'Pain Level (1-10)', type: 'number', required: true, group: 'service_specific' },
            { field: 'sitePhotos', label: 'Surgical Site Photos', type: 'image', required: true, minImages: 1, group: 'service_specific' },
        ],
        color: '#2980B9',
        icon: '🏥',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Elderly Care': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false, group: 'vitals' },
            { field: 'bloodSugar', label: 'Blood Sugar', type: 'number', required: false, group: 'vitals' },
            { field: 'mobilityAssessment', label: 'Mobility Assessment', type: 'select', required: true, options: ['independent', 'needs_assistance', 'wheelchair', 'bedridden'], group: 'service_specific' },
            { field: 'medicationAdherence', label: 'Medication Adherence', type: 'select', required: true, options: ['full', 'partial', 'non_adherent'], group: 'service_specific' },
        ],
        color: '#F39C12',
        icon: '👴',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Pediatric Nursing': {
        nurseFields: [
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: true, group: 'vitals' },
            { field: 'temperature', label: 'Temperature (°C)', type: 'number', required: true, group: 'vitals' },
            { field: 'respiratoryRate', label: 'Respiratory Rate', type: 'number', required: true, group: 'vitals' },
            { field: 'pulse', label: 'Pulse (bpm)', type: 'number', required: true, group: 'vitals' },
            { field: 'feedingPattern', label: 'Feeding Pattern & Notes', type: 'textarea', required: true, group: 'service_specific', description: 'Document feeding type (breast/bottle/solid), frequency, and any concerns' },
        ],
        color: '#E91E63',
        icon: '👶',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Catheter Care': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'catheterSiteCheck', label: 'Catheter Site Assessment', type: 'textarea', required: true, group: 'service_specific' },
            { field: 'catheterChanged', label: 'Catheter Changed', type: 'boolean', required: true, group: 'service_specific' },
            { field: 'urineOutput', label: 'Urine Output (ml)', type: 'number', required: true, group: 'service_specific' },
            { field: 'infectionSigns', label: 'Infection Signs', type: 'select', required: true, options: ['none', 'redness', 'swelling', 'discharge', 'fever', 'multiple'], group: 'service_specific' },
        ],
        color: '#16A085',
        icon: '🔬',
        urgentSubmit: false,
        isEmergency: false,
    },

    'Emergency Assessment': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'severityTag', label: 'Severity Level', type: 'select', required: true, options: ['critical', 'serious', 'stable'], group: 'service_specific', description: 'Select the patient severity level' },
            { field: 'briefNotes', label: 'Brief Assessment Notes', type: 'textarea', required: true, group: 'service_specific' },
        ],
        color: '#E74C3C',
        icon: '🚨',
        urgentSubmit: true,
        isEmergency: true,
    },
};

export function getServiceFlowUI(serviceType: string): ServiceFlowUI | null {
    return SERVICE_FLOW_UI[serviceType] || null;
}
