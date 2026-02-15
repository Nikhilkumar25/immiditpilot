/**
 * Service Flow Configuration
 * Defines per-service validation rules for nurse and doctor workflows.
 */

export interface NurseFieldRequirement {
    field: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'image' | 'datetime' | 'textarea';
    required: boolean;
    options?: string[];     // For select fields
    minImages?: number;     // For image fields
    description?: string;
}

export interface ServiceFlowDef {
    // Nurse requirements
    nurseFields: NurseFieldRequirement[];
    requiresVitals: boolean;
    requiresImages: boolean;
    minImages: number;
    requiresPrescriptionVerification: boolean;

    // Doctor requirements
    doctorMustAct: boolean;          // Doctor MUST review — cannot auto-close
    autoCloseCondition?: string;     // Condition under which case auto-closes without doctor
    doctorReviewFields: string[];    // Extra fields doctor must address

    // Emergency flags
    isEmergency: boolean;
    skipQueue: boolean;
    alertDoctorImmediately: boolean;
}

const BASE_VITALS: NurseFieldRequirement[] = [
    { field: 'bloodPressure', label: 'Blood Pressure', type: 'text', required: true },
    { field: 'pulse', label: 'Pulse (bpm)', type: 'number', required: true },
    { field: 'temperature', label: 'Temperature (°C)', type: 'number', required: true },
    { field: 'spO2', label: 'SpO₂ (%)', type: 'number', required: true },
];

export const SERVICE_FLOW_CONFIG: Record<string, ServiceFlowDef> = {

    'General Checkup': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false },
            { field: 'observations', label: 'Physical Observations', type: 'textarea', required: true },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['diagnosis', 'prescription'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Vitals Monitoring': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false },
            { field: 'bloodSugar', label: 'Blood Sugar', type: 'number', required: false },
            { field: 'previousComparison', label: 'Comparison with Previous Visit', type: 'textarea', required: false },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['trendReview', 'medicationAdjustment'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Wound Dressing': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'woundPhotoBefore', label: 'Wound Photo (Before)', type: 'image', required: true, minImages: 1 },
            { field: 'woundPhotoAfter', label: 'Wound Photo (After)', type: 'image', required: true, minImages: 1 },
            { field: 'healingStage', label: 'Healing Stage', type: 'select', required: true, options: ['inflammatory', 'proliferative', 'maturation', 'infected'] },
            { field: 'dressingNotes', label: 'Dressing Notes', type: 'textarea', required: true },
        ],
        requiresVitals: true,
        requiresImages: true,
        minImages: 2,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['woundAssessment', 'antibioticModification'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'IV Therapy': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'prescriptionVerified', label: 'Prescription Verified', type: 'boolean', required: true },
            { field: 'infusionStartTime', label: 'Infusion Start Time', type: 'datetime', required: true },
            { field: 'infusionEndTime', label: 'Infusion End Time', type: 'datetime', required: false },
            { field: 'infusionNotes', label: 'Infusion Notes', type: 'textarea', required: false },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: true,
        doctorMustAct: true,
        doctorReviewFields: ['dosageVerification', 'therapyCompletion'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Injection': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'prescriptionVerified', label: 'Prescription Verified', type: 'boolean', required: true },
            { field: 'injectionAdministered', label: 'Injection Administered', type: 'boolean', required: true },
            { field: 'monitoringDuration', label: 'Monitoring Duration (mins)', type: 'number', required: true },
            { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: true,
        doctorMustAct: false,
        autoCloseCondition: 'reactionStatus === "none"',
        doctorReviewFields: ['adverseReactionReview'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Post-Operative Care': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'surgicalSiteCheck', label: 'Surgical Site Check', type: 'textarea', required: true },
            { field: 'painLevel', label: 'Pain Level (1-10)', type: 'number', required: true },
            { field: 'sitePhotos', label: 'Surgical Site Photos', type: 'image', required: true, minImages: 1 },
        ],
        requiresVitals: true,
        requiresImages: true,
        minImages: 1,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['healingAssessment', 'medicationAdjustment', 'followupSchedule'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Elderly Care': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false },
            { field: 'bloodSugar', label: 'Blood Sugar', type: 'number', required: false },
            { field: 'mobilityAssessment', label: 'Mobility Assessment', type: 'select', required: true, options: ['independent', 'needs_assistance', 'wheelchair', 'bedridden'] },
            { field: 'medicationAdherence', label: 'Medication Adherence', type: 'select', required: true, options: ['full', 'partial', 'non_adherent'] },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['chronicMedicationReview', 'labRecommendation'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Pediatric Nursing': {
        nurseFields: [
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: true },
            { field: 'temperature', label: 'Temperature (°C)', type: 'number', required: true },
            { field: 'respiratoryRate', label: 'Respiratory Rate', type: 'number', required: true },
            { field: 'pulse', label: 'Pulse (bpm)', type: 'number', required: true },
            { field: 'feedingPattern', label: 'Feeding Pattern Notes', type: 'textarea', required: true },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['diagnosis', 'pediatricPrescription'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Catheter Care': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'catheterSiteCheck', label: 'Catheter Site Check', type: 'textarea', required: true },
            { field: 'catheterChanged', label: 'Catheter Changed', type: 'boolean', required: true },
            { field: 'urineOutput', label: 'Urine Output (ml)', type: 'number', required: true },
            { field: 'infectionSigns', label: 'Infection Signs', type: 'select', required: true, options: ['none', 'redness', 'swelling', 'discharge', 'fever', 'multiple'] },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['infectionRiskAssessment', 'antibioticPrescription'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Emergency Assessment': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'severityTag', label: 'Severity Tag', type: 'select', required: true, options: ['critical', 'serious', 'stable'] },
            { field: 'briefNotes', label: 'Brief Assessment Notes', type: 'textarea', required: true },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: false,
        doctorMustAct: true,
        doctorReviewFields: ['hospitalReferral', 'immediatePrescription', 'continueCare'],
        isEmergency: true,
        skipQueue: true,
        alertDoctorImmediately: true,
    },
};

// All valid service types
export const VALID_SERVICE_TYPES = Object.keys(SERVICE_FLOW_CONFIG);

/**
 * Get the flow config for a given service type.
 * Returns null if the service type is not recognized.
 */
export function getFlowConfig(serviceType: string): ServiceFlowDef | null {
    return SERVICE_FLOW_CONFIG[serviceType] || null;
}

/**
 * Validate nurse submission fields against the flow config.
 * Returns an array of error messages, empty if valid.
 */
export function validateNurseSubmission(
    serviceType: string,
    vitalsJson: Record<string, any>,
    attachments: string[],
): string[] {
    const config = getFlowConfig(serviceType);
    if (!config) return [`Unknown service type: ${serviceType}`];

    const errors: string[] = [];

    // Check required nurse fields
    for (const field of config.nurseFields) {
        if (field.required) {
            const value = vitalsJson[field.field];
            if (value === undefined || value === null || value === '') {
                errors.push(`${field.label} is required for ${serviceType}`);
            }
            // Boolean fields: must be explicitly true (not just truthy string)
            if (field.type === 'boolean' && value !== true && value !== 'true') {
                if (field.field === 'prescriptionVerified') {
                    errors.push(`Prescription must be verified for ${serviceType}`);
                }
            }
        }
    }

    // Check image requirements
    if (config.requiresImages && attachments.length < config.minImages) {
        errors.push(`${serviceType} requires at least ${config.minImages} image(s). Got ${attachments.length}.`);
    }

    return errors;
}

/**
 * Check if a case can auto-close without doctor review.
 * Used for Injection services with no adverse reaction.
 */
export function canAutoClose(serviceType: string, vitalsJson: Record<string, any>): boolean {
    const config = getFlowConfig(serviceType);
    if (!config || config.doctorMustAct) return false;

    if (serviceType === 'Injection') {
        return vitalsJson.reactionStatus === 'none';
    }

    return false;
}
