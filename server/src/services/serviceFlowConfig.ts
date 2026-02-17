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
    min?: number;           // Sense check: minimum value
    max?: number;           // Sense check: maximum value
    stage?: 'assessment' | 'procedure'; // NEW: For multi-stage workflows
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
    requiresProcedureApproval?: boolean; // NEW: Approval needed before procedure
    doctorReviewFields: string[];    // Extra fields doctor must address

    // Emergency flags
    isEmergency: boolean;
    skipQueue: boolean;
    alertDoctorImmediately: boolean;
}

const BASE_VITALS: NurseFieldRequirement[] = [
    { field: 'bpSystolic', label: 'BP Systolic (mmHg)', type: 'number', required: true, stage: 'assessment', min: 70, max: 200 },
    { field: 'bpDiastolic', label: 'BP Diastolic (mmHg)', type: 'number', required: true, stage: 'assessment', min: 40, max: 130 },
    { field: 'pulse', label: 'Pulse (bpm)', type: 'number', required: true, stage: 'assessment', min: 40, max: 180 },
    { field: 'temperature', label: 'Temperature (°F)', type: 'number', required: true, stage: 'assessment', min: 94, max: 108 },
    { field: 'spO2', label: 'SpO₂ (%)', type: 'number', required: true, stage: 'assessment', min: 70, max: 100 },
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
        doctorReviewFields: ['diagnosis', 'advice', 'medications', 'prescription'],
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
        requiresProcedureApproval: true,
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
        requiresProcedureApproval: true,
        doctorReviewFields: ['dosageVerification', 'therapyCompletion'],
        isEmergency: false,
        skipQueue: false,
        alertDoctorImmediately: false,
    },

    'Injection': {
        nurseFields: [
            ...BASE_VITALS,
            {
                field: 'prescriptionStatus',
                label: 'Prescription Status',
                type: 'select',
                required: true,
                options: ['Verified (On-Site)', 'Missing (Request from Doctor)', 'Inaccurate/Conflict'],
                stage: 'assessment',
                description: 'Verify the prescription or request a new one from the doctor (₹199 fee applies for new requests).'
            },
            { field: 'injectionAdministered', label: 'Injection Administered', type: 'boolean', required: true, stage: 'procedure' },
            { field: 'monitoringDuration', label: 'Monitoring Duration (mins)', type: 'number', required: true, stage: 'procedure' },
            { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure' },
        ],
        requiresVitals: true,
        requiresImages: false,
        minImages: 0,
        requiresPrescriptionVerification: true,
        doctorMustAct: false,
        requiresProcedureApproval: true,
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
        requiresProcedureApproval: true,
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
        doctorReviewFields: ['diagnosis', 'advice', 'medications', 'pediatricPrescription'],
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

    // ---------- Fever & Infection Care ----------
    'High Fever Check': {
        nurseFields: [...BASE_VITALS, { field: 'observations', label: 'Observations', type: 'textarea', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice', 'medications'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Dengue Test (NS1 + Platelets)': {
        nurseFields: [...BASE_VITALS, { field: 'sampleType', label: 'Sample Type', type: 'select', required: true, options: ['Blood'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Viral Fever': {
        nurseFields: [...BASE_VITALS, { field: 'observations', label: 'Symptoms', type: 'textarea', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice', 'medications'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Loose Motions / Diarrhea': {
        nurseFields: [...BASE_VITALS, { field: 'dehydrationStatus', label: 'Dehydration Level', type: 'select', required: true, options: ['None', 'Mild', 'Moderate', 'Severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Tetanus (TT) Shot': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['medicationAdjustment'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Rabies Vaccine (Dog Bite)': {
        nurseFields: [...BASE_VITALS, { field: 'woundPhoto', label: 'Bite Mark Photo', type: 'image', required: true }],
        requiresVitals: true, requiresImages: true, minImages: 1, requiresPrescriptionVerification: true,
        doctorMustAct: true, doctorReviewFields: ['vaccineSchedule', 'diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },

    // ---------- Diabetes & BP Care ----------
    'Sugar Test (Fasting / Random)': {
        nurseFields: [...BASE_VITALS, { field: 'bloodSugar', label: 'Sugar Level (mg/dL)', type: 'number', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'HbA1c (3-Month Avg Sugar)': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'BP Check': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Insulin Injection Help': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Diabetic Foot Check': {
        nurseFields: [...BASE_VITALS, { field: 'sitePhoto', label: 'Foot Photo', type: 'image', required: true }],
        requiresVitals: true, requiresImages: true, minImages: 1, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },

    // ---------- Thyroid & Hormone Tests ----------
    'TSH Test': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'T3 / T4': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Thyroid Full Panel': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },

    // ---------- Vaccinations ----------
    'Hepatitis A': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Hepatitis B (3 Doses)': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'HPV (Cervical Cancer Vaccine)': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Flu Shot': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Tetanus Booster': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Rabies Vaccine': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: true,
        doctorMustAct: false, autoCloseCondition: 'reactionStatus === "none"', doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },

    // ---------- Elder & Home Support ----------
    'Monthly Elder Visit': {
        nurseFields: [...BASE_VITALS, { field: 'mobilityAssessment', label: 'Mobility', type: 'select', required: true, options: ['Walking', 'Assistance Needed', 'Wheelchair', 'Bedridden'] }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Vitals Monitoring': {
        nurseFields: [...BASE_VITALS, { field: 'bloodSugar', label: 'Sugar Level', type: 'number', required: false }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Catheter Care': {
        nurseFields: [...BASE_VITALS, { field: 'catheterSiteCheck', label: 'Site Status', type: 'textarea', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Bedridden Care': {
        nurseFields: [...BASE_VITALS, { field: 'skinIntegrity', label: 'Bedsores / Skin Check', type: 'textarea', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Post-Hospital Care': {
        nurseFields: [...BASE_VITALS, { field: 'surgerySiteCheck', label: 'Surgical Site Status', type: 'textarea', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },

    // ---------- Lab & Health Checkups ----------
    'CBC': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Platelet Count': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Lipid Profile': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'LFT / KFT': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Vitamin D / B12': {
        nurseFields: [...BASE_VITALS],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
    },
    'Full Body Checkup': {
        nurseFields: [...BASE_VITALS, { field: 'fastingStatus', label: 'Fasting?', type: 'boolean', required: true }],
        requiresVitals: true, requiresImages: false, minImages: 0, requiresPrescriptionVerification: false,
        doctorMustAct: true, doctorReviewFields: ['diagnosis', 'advice'], isEmergency: false, skipQueue: false, alertDoctorImmediately: false,
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
    stage: 'assessment' | 'procedure' = 'assessment', // NEW: Added stage parameter
): string[] {
    const config = getFlowConfig(serviceType);
    if (!config) return [`Unknown service type: ${serviceType}`];

    const errors: string[] = [];

    // Check required nurse fields
    for (const field of config.nurseFields) {
        // Skip validation if field is for a different stage
        if (field.stage && field.stage !== stage) continue;

        if (field.required) {
            const value = vitalsJson[field.field];
            if (value === undefined || value === null || value === '') {
                errors.push(`${field.label} is required`);
            }
            // Boolean fields: must be explicitly true for specific restricted checks
            if (field.type === 'boolean' && value !== true && value !== 'true') {
                if (field.field === 'injectionAdministered' && stage === 'procedure') {
                    errors.push(`Injection must be administered to complete procedure`);
                }
            }
        }
    }

    // Check procedure approval requirements
    const isRequestingDoctorPrescription = vitalsJson.prescriptionStatus === 'Missing (Request from Doctor)';

    if (config.requiresProcedureApproval && !vitalsJson.prescriptionPhoto && !isRequestingDoctorPrescription) {
        errors.push(`Prescription photo is required for restricted procedure: ${serviceType} (unless requesting from doctor)`);
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
