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
    min?: number;
    max?: number;
    group?: 'vitals' | 'service_specific';
    stage?: 'assessment' | 'procedure'; // NEW: For multi-stage workflows
}

export interface ServiceFlowUI {
    nurseFields: NurseFormField[];
    color: string;           // Badge / accent color
    icon: string;            // Lucide icon name
    urgentSubmit: boolean;   // Red submit button for emergencies
    isEmergency: boolean;
    autoCloseInfo?: string;  // Message about auto-close if applicable
    requiresProcedureApproval?: boolean;
}

const BASE_VITALS: NurseFormField[] = [
    { field: 'bpSystolic', label: 'BP Systolic (mmHg)', type: 'number', required: true, group: 'vitals', stage: 'assessment', min: 70, max: 200 },
    { field: 'bpDiastolic', label: 'BP Diastolic (mmHg)', type: 'number', required: true, group: 'vitals', stage: 'assessment', min: 40, max: 130 },
    { field: 'pulse', label: 'Pulse (bpm)', type: 'number', required: true, group: 'vitals', stage: 'assessment', min: 40, max: 180 },
    { field: 'temperature', label: 'Temperature (°F)', type: 'number', required: true, group: 'vitals', stage: 'assessment', min: 94, max: 108 },
    { field: 'spO2', label: 'SpO₂ (%)', type: 'number', required: true, group: 'vitals', stage: 'assessment', min: 70, max: 100 },
];

export const SERVICE_FLOW_UI: Record<string, ServiceFlowUI> = {

    'General Checkup': {
        nurseFields: [
            ...BASE_VITALS,
            { field: 'weight', label: 'Weight (kg)', type: 'number', required: false, group: 'vitals' },
            { field: 'observations', label: 'Physical Observations', type: 'textarea', required: true, group: 'service_specific' },
        ],
        color: '#4A90D9',
        icon: 'Stethoscope',
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
        icon: 'Bandage',
        urgentSubmit: false,
        isEmergency: false,
        requiresProcedureApproval: true,
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
        icon: 'Syringe',
        urgentSubmit: false,
        isEmergency: false,
        requiresProcedureApproval: true,
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
                description: '₹199 fee applies if requesting from doctor'
            },
            { field: 'injectionAdministered', label: 'Injection Administered', type: 'boolean', required: true, group: 'service_specific', stage: 'procedure' },
            { field: 'monitoringDuration', label: 'Monitoring Duration (mins)', type: 'number', required: true, group: 'service_specific', description: 'Monitor patient for at least 15 minutes after injection', stage: 'procedure' },
            { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], group: 'service_specific', stage: 'procedure' },
        ],
        color: '#27AE60',
        icon: 'Pill',
        urgentSubmit: false,
        isEmergency: false,
        requiresProcedureApproval: true,
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
        icon: 'Hospital',
        urgentSubmit: false,
        isEmergency: false,
        requiresProcedureApproval: true,
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
        icon: 'HeartHandshake',
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
        icon: 'Baby',
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
        icon: 'Siren',
        urgentSubmit: true,
        isEmergency: true,
    },

    // ---------- Fever & Infection Care ----------
    'High Fever Check': {
        nurseFields: [...BASE_VITALS, { field: 'observations', label: 'Observations', type: 'textarea', required: true, group: 'service_specific' }],
        color: '#FF6B6B', icon: 'Stethoscope', urgentSubmit: false, isEmergency: false,
    },
    'Dengue Test (NS1 + Platelets)': {
        nurseFields: [...BASE_VITALS, { field: 'sampleType', label: 'Sample Type', type: 'select', required: true, options: ['Blood'], group: 'service_specific' }],
        color: '#FF6B6B', icon: 'FlaskConical', urgentSubmit: false, isEmergency: false,
    },
    'Viral Fever': {
        nurseFields: [...BASE_VITALS, { field: 'observations', label: 'Symptoms', type: 'textarea', required: true, group: 'service_specific' }],
        color: '#FF6B6B', icon: 'Thermometer', urgentSubmit: false, isEmergency: false,
    },
    'Loose Motions / Diarrhea': {
        nurseFields: [...BASE_VITALS, { field: 'dehydrationStatus', label: 'Dehydration Level', type: 'select', required: true, options: ['None', 'Mild', 'Moderate', 'Severe'], group: 'service_specific' }],
        color: '#FF6B6B', icon: 'Droplet', urgentSubmit: false, isEmergency: false,
    },
    'Tetanus (TT) Shot': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#FF6B6B', icon: 'Syringe', urgentSubmit: false, isEmergency: false, autoCloseInfo: 'If reaction is "none", case auto-closes.',
    },
    'Rabies Vaccine (Dog Bite)': {
        nurseFields: [...BASE_VITALS, { field: 'woundPhoto', label: 'Bite Mark Photo', type: 'image', required: true, group: 'service_specific' }],
        color: '#FF6B6B', icon: 'Dog', urgentSubmit: false, isEmergency: false,
    },

    // ---------- Diabetes & BP Care ----------
    'Sugar Test (Fasting / Random)': {
        nurseFields: [...BASE_VITALS, { field: 'bloodSugar', label: 'Sugar Level (mg/dL)', type: 'number', required: true, group: 'vitals' }],
        color: '#20B2AA', icon: 'Droplets', urgentSubmit: false, isEmergency: false,
    },
    'HbA1c (3-Month Avg Sugar)': {
        nurseFields: [...BASE_VITALS],
        color: '#20B2AA', icon: 'BarChart3', urgentSubmit: false, isEmergency: false,
    },
    'BP Check': {
        nurseFields: [...BASE_VITALS],
        color: '#20B2AA', icon: 'Stethoscope', urgentSubmit: false, isEmergency: false,
    },
    'Insulin Injection Help': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#20B2AA', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },
    'Diabetic Foot Check': {
        nurseFields: [...BASE_VITALS, { field: 'sitePhoto', label: 'Foot Photo', type: 'image', required: true, group: 'service_specific' }],
        color: '#20B2AA', icon: 'Footprints', urgentSubmit: false, isEmergency: false,
    },

    // ---------- Thyroid & Hormone Tests ----------
    'TSH Test': {
        nurseFields: [...BASE_VITALS],
        color: '#9B59B6', icon: 'Dna', urgentSubmit: false, isEmergency: false,
    },
    'T3 / T4': {
        nurseFields: [...BASE_VITALS],
        color: '#9B59B6', icon: 'Dna', urgentSubmit: false, isEmergency: false,
    },
    'Thyroid Full Panel': {
        nurseFields: [...BASE_VITALS],
        color: '#9B59B6', icon: 'Dna', urgentSubmit: false, isEmergency: false,
    },

    // ---------- Vaccinations ----------
    'Hepatitis A': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#3498DB', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },
    'Hepatitis B (3 Doses)': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#3498DB', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },
    'HPV (Cervical Cancer Vaccine)': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#3498DB', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },
    'Flu Shot': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#3498DB', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },
    'Tetanus Booster': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#3498DB', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },
    'Rabies Vaccine': {
        nurseFields: [...BASE_VITALS, { field: 'reactionStatus', label: 'Reaction Status', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'], stage: 'procedure', group: 'service_specific' }],
        color: '#3498DB', icon: 'Syringe', urgentSubmit: false, isEmergency: false,
    },

    // ---------- Elder & Home Support ----------
    'Monthly Elder Visit': {
        nurseFields: [...BASE_VITALS, { field: 'mobilityAssessment', label: 'Mobility', type: 'select', required: true, options: ['Walking', 'Assistance Needed', 'Wheelchair', 'Bedridden'], group: 'service_specific' }],
        color: '#E91E8C', icon: 'HeartHandshake', urgentSubmit: false, isEmergency: false,
    },
    'Vitals Monitoring': {
        nurseFields: [...BASE_VITALS, { field: 'bloodSugar', label: 'Sugar Level', type: 'number', required: false, group: 'vitals' }],
        color: '#E91E8C', icon: 'Activity', urgentSubmit: false, isEmergency: false,
    },
    'Catheter Care': {
        nurseFields: [...BASE_VITALS, { field: 'catheterSiteCheck', label: 'Site Status', type: 'textarea', required: true, group: 'service_specific' }],
        color: '#E91E8C', icon: 'Microscope', urgentSubmit: false, isEmergency: false,
    },
    'Bedridden Care': {
        nurseFields: [...BASE_VITALS, { field: 'skinIntegrity', label: 'Bedsores / Skin Check', type: 'textarea', required: true, group: 'service_specific' }],
        color: '#E91E8C', icon: 'BedDouble', urgentSubmit: false, isEmergency: false,
    },
    'Post-Hospital Care': {
        nurseFields: [...BASE_VITALS, { field: 'surgerySiteCheck', label: 'Surgical Site Status', type: 'textarea', required: true, group: 'service_specific' }],
        color: '#E91E8C', icon: 'Hospital', urgentSubmit: false, isEmergency: false,
    },

    // ---------- Lab & Health Checkups ----------
    'CBC': {
        nurseFields: [...BASE_VITALS],
        color: '#7F8C8D', icon: 'FlaskConical', urgentSubmit: false, isEmergency: false,
    },
    'Platelet Count': {
        nurseFields: [...BASE_VITALS],
        color: '#7F8C8D', icon: 'Microscope', urgentSubmit: false, isEmergency: false,
    },
    'Lipid Profile': {
        nurseFields: [...BASE_VITALS],
        color: '#7F8C8D', icon: 'FlaskConical', urgentSubmit: false, isEmergency: false,
    },
    'LFT / KFT': {
        nurseFields: [...BASE_VITALS],
        color: '#7F8C8D', icon: 'FlaskConical', urgentSubmit: false, isEmergency: false,
    },
    'Vitamin D / B12': {
        nurseFields: [...BASE_VITALS],
        color: '#7F8C8D', icon: 'FlaskConical', urgentSubmit: false, isEmergency: false,
    },
    'Full Body Checkup': {
        nurseFields: [...BASE_VITALS, { field: 'fastingStatus', label: 'Fasting?', type: 'boolean', required: true, group: 'service_specific' }],
        color: '#7F8C8D', icon: 'BarChart3', urgentSubmit: false, isEmergency: false,
    },
};

export function getServiceFlowUI(serviceType: string): ServiceFlowUI | null {
    return SERVICE_FLOW_UI[serviceType] || null;
}
