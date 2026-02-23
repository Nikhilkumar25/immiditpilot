// ============ PATIENT DASHBOARD CONFIGURATION ============

// ---------- Pricing Constants ----------

export const PRICING = {
    VISIT_FEE: 499,
    COLLECTION_FEE: 49,
    APPLICATION_CHARGE_MIN: 149,
    APPLICATION_CHARGE_MAX: 399,
    DRIP_APPLICATION_MIN: 299,
    DRIP_APPLICATION_MAX: 399,
    FOLLOW_UP_FIRST: 149,
    FOLLOW_UP_REGULAR: 299,
    FOLLOW_UP_WINDOW_DAYS: 7,
    DETAILED_VITALS: 699,
    MEDICINE_DISCOUNT_PCT: 20,
} as const;

// ---------- Types ----------

export interface ServiceOption {
    id: string;
    label: string;
    tooltip?: string;
    priceType: 'flat' | 'range' | 'calculated' | 'lab';
    basePrice: number;
    maxPrice?: number;
    complexityOptions?: { label: string; price: number }[];
}

export interface ServiceCategory {
    id: string;
    title: string;
    icon: string;
    color: string;       // pastel hex for left border / background
    colorLight: string;  // very light tint for expanded background
    services: ServiceOption[];
}

export interface QuickAction {
    id: string;
    icon: string;
    label: string;
    categoryId: string;
    serviceId: string;
}

export interface SmartSuggestion {
    message: string;
    suggestedServiceId: string;
    suggestedLabel: string;
    suggestedPrice: number;
}

export interface PriceLineItem {
    label: string;
    amount: number;
    isDiscount?: boolean;
}

export interface PriceBreakdown {
    lineItems: PriceLineItem[];
    total: number;
}

// ---------- Quick Actions ----------

export const QUICK_ACTIONS: QuickAction[] = [
    { id: 'qa-fever', icon: 'Thermometer', label: 'Fever Check', categoryId: 'fever-infection', serviceId: 'high-fever' },
    { id: 'qa-sugar', icon: 'Droplets', label: 'Sugar Test', categoryId: 'diabetes-bp', serviceId: 'sugar-test' },
    { id: 'qa-vaccine', icon: 'Syringe', label: 'Vaccine', categoryId: 'vaccinations', serviceId: 'flu-shot' },
    { id: 'qa-elder', icon: 'HeartHandshake', label: 'Elder Care', categoryId: 'elder-support', serviceId: 'monthly-elder' },
    { id: 'qa-blood', icon: 'FlaskConical', label: 'Blood Test', categoryId: 'lab-checkups', serviceId: 'cbc' },
    { id: 'qa-injection', icon: 'Pill', label: 'Injection', categoryId: 'fever-infection', serviceId: 'tt-shot' },
    { id: 'qa-drip', icon: 'Droplet', label: 'IV Drip', categoryId: 'fever-infection', serviceId: 'high-fever' },
    { id: 'qa-dressing', icon: 'Bandage', label: 'Dressing', categoryId: 'elder-support', serviceId: 'bedridden-care' },
    { id: 'qa-urgent', icon: 'Ambulance', label: 'Urgent Visit', categoryId: 'fever-infection', serviceId: 'high-fever' },
    { id: 'qa-checkup', icon: 'BarChart3', label: 'Full Checkup', categoryId: 'lab-checkups', serviceId: 'full-body' },
    { id: 'qa-dogbite', icon: 'Dog', label: 'Dog Bite', categoryId: 'fever-infection', serviceId: 'rabies-vaccine' },
];

// ---------- Service Categories ----------

export const SERVICE_CATEGORIES: ServiceCategory[] = [
    {
        id: 'fever-infection',
        title: 'Fever & Infection Care',
        icon: 'Stethoscope',
        color: '#FF6B6B',
        colorLight: '#FFF0F0',
        services: [
            { id: 'high-fever', label: 'High Fever Check', priceType: 'flat', basePrice: 499 },
            { id: 'dengue-test', label: 'Dengue Test (NS1 + Platelets)', priceType: 'lab', basePrice: 399, tooltip: 'NS1 antigen + platelet count' },
            { id: 'viral-fever', label: 'Viral Fever', priceType: 'flat', basePrice: 499 },
            { id: 'loose-motions', label: 'Loose Motions / Diarrhea', priceType: 'flat', basePrice: 499 },
            { id: 'tt-shot', label: 'Tetanus (TT) Shot', priceType: 'calculated', basePrice: 499, tooltip: 'Visit + injection application' },
            { id: 'rabies-vaccine', label: 'Rabies Vaccine (Dog Bite)', priceType: 'calculated', basePrice: 499, tooltip: 'Visit + vaccine cost' },
        ],
    },
    {
        id: 'diabetes-bp',
        title: 'Diabetes & BP Care',
        icon: 'Droplets',
        color: '#20B2AA',
        colorLight: '#E8FAF8',
        services: [
            { id: 'sugar-test', label: 'Sugar Test (Fasting / Random)', priceType: 'lab', basePrice: 199, tooltip: 'Fasting or random blood glucose' },
            { id: 'hba1c', label: 'HbA1c (3-Month Avg Sugar)', priceType: 'lab', basePrice: 449, tooltip: 'Glycated hemoglobin — shows 3-month average blood sugar' },
            { id: 'bp-check', label: 'BP Check', priceType: 'flat', basePrice: 499 },
            { id: 'insulin-help', label: 'Insulin Injection Help', priceType: 'calculated', basePrice: 499, tooltip: 'Visit + injection application' },
            { id: 'diabetic-foot', label: 'Diabetic Foot Check', priceType: 'flat', basePrice: 499 },
        ],
    },
    {
        id: 'thyroid-hormone',
        title: 'Thyroid & Hormone Tests',
        icon: 'Dna',
        color: '#9B59B6',
        colorLight: '#F5EEFA',
        services: [
            { id: 'tsh', label: 'TSH Test', priceType: 'lab', basePrice: 299, tooltip: 'Thyroid Stimulating Hormone' },
            { id: 't3-t4', label: 'T3 / T4', priceType: 'lab', basePrice: 399, tooltip: 'Active thyroid hormones' },
            { id: 'thyroid-panel', label: 'Thyroid Full Panel', priceType: 'lab', basePrice: 599, tooltip: 'TSH + T3 + T4 + Free T3/T4' },
        ],
    },
    {
        id: 'vaccinations',
        title: 'Vaccinations',
        icon: 'Syringe',
        color: '#3498DB',
        colorLight: '#EBF5FB',
        services: [
            { id: 'hep-a', label: 'Hepatitis A', priceType: 'calculated', basePrice: 499 },
            { id: 'hep-b', label: 'Hepatitis B (3 Doses)', priceType: 'calculated', basePrice: 499, tooltip: '3-dose schedule over 6 months' },
            { id: 'hpv', label: 'HPV (Cervical Cancer Vaccine)', priceType: 'calculated', basePrice: 499, tooltip: 'Human Papillomavirus vaccine' },
            { id: 'flu-shot', label: 'Flu Shot', priceType: 'calculated', basePrice: 499 },
            { id: 'tetanus-booster', label: 'Tetanus Booster', priceType: 'calculated', basePrice: 499 },
            { id: 'rabies-vax', label: 'Rabies Vaccine', priceType: 'calculated', basePrice: 499 },
        ],
    },
    {
        id: 'elder-support',
        title: 'Elder & Home Support',
        icon: 'HeartHandshake',
        color: '#E91E8C',
        colorLight: '#FDE8F4',
        services: [
            { id: 'monthly-elder', label: 'Monthly Elder Visit', priceType: 'flat', basePrice: 499 },
            { id: 'vitals-monitor', label: 'Vitals Monitoring', priceType: 'flat', basePrice: 699, tooltip: 'BP, Sugar, Pulse, Oxygen, Temp, Weight' },
            {
                id: 'catheter-care', label: 'Catheter Care', priceType: 'range', basePrice: 999, maxPrice: 1999,
                complexityOptions: [
                    { label: 'Routine Change', price: 999 },
                    { label: 'Complicated Case', price: 1999 },
                ],
            },
            { id: 'bedridden-care', label: 'Bedridden Care', priceType: 'flat', basePrice: 499 },
            { id: 'post-hospital', label: 'Post-Hospital Care', priceType: 'flat', basePrice: 499 },
        ],
    },
    {
        id: 'lab-checkups',
        title: 'Lab & Health Checkups',
        icon: 'FlaskConical',
        color: '#7F8C8D',
        colorLight: '#F2F4F4',
        services: [
            { id: 'cbc', label: 'CBC', priceType: 'lab', basePrice: 399, tooltip: 'Complete Blood Count' },
            { id: 'platelet-count', label: 'Platelet Count', priceType: 'lab', basePrice: 249 },
            { id: 'lipid-profile', label: 'Lipid Profile', priceType: 'lab', basePrice: 499, tooltip: 'Cholesterol, HDL, LDL, Triglycerides' },
            { id: 'lft-kft', label: 'LFT / KFT', priceType: 'lab', basePrice: 549, tooltip: 'Liver Function / Kidney Function Tests' },
            { id: 'vitamin-d-b12', label: 'Vitamin D / B12', priceType: 'lab', basePrice: 699 },
            { id: 'full-body', label: 'Full Body Checkup', priceType: 'lab', basePrice: 1499, tooltip: 'CBC, Lipid, LFT, KFT, Thyroid, Sugar, Vitamin D/B12' },
        ],
    },
];

// ---------- Smart Suggestions ----------

export const SMART_SUGGESTIONS: Record<string, SmartSuggestion[]> = {
    'high-fever': [
        { message: 'Add Dengue + CBC Test?', suggestedServiceId: 'dengue-test', suggestedLabel: 'Dengue Test', suggestedPrice: 399 },
        { message: 'Add CBC for ₹399?', suggestedServiceId: 'cbc', suggestedLabel: 'CBC', suggestedPrice: 399 },
    ],
    'viral-fever': [
        { message: 'Add Dengue + CBC Test?', suggestedServiceId: 'dengue-test', suggestedLabel: 'Dengue Test', suggestedPrice: 399 },
    ],
    'sugar-test': [
        { message: 'Add HbA1c (3-Month Avg)?', suggestedServiceId: 'hba1c', suggestedLabel: 'HbA1c', suggestedPrice: 449 },
    ],
    'insulin-help': [
        { message: 'Add HbA1c (3-Month Avg)?', suggestedServiceId: 'hba1c', suggestedLabel: 'HbA1c', suggestedPrice: 449 },
    ],
    'bp-check': [
        { message: 'Add Sugar Test for ₹199?', suggestedServiceId: 'sugar-test', suggestedLabel: 'Sugar Test', suggestedPrice: 199 },
    ],
    'bedridden-care': [
        { message: 'Add Follow-up Visit ₹149?', suggestedServiceId: 'follow-up', suggestedLabel: 'Follow-up', suggestedPrice: 149 },
    ],
    'catheter-care': [
        { message: 'Add Follow-up Visit ₹149?', suggestedServiceId: 'follow-up', suggestedLabel: 'Follow-up', suggestedPrice: 149 },
    ],
};

// ---------- Pricing Calculator ----------

export function calculatePrice(
    service: ServiceOption,
    options?: { complexityIndex?: number; addOns?: ServiceOption[] }
): PriceBreakdown {
    const lineItems: PriceLineItem[] = [];

    switch (service.priceType) {
        case 'flat':
            lineItems.push({ label: service.label, amount: service.basePrice });
            break;

        case 'lab':
            lineItems.push({ label: service.label, amount: service.basePrice });
            lineItems.push({ label: 'Collection Fee', amount: PRICING.COLLECTION_FEE });
            break;

        case 'calculated':
            lineItems.push({ label: 'Nurse Visit', amount: PRICING.VISIT_FEE });
            lineItems.push({ label: 'Application Charge', amount: PRICING.APPLICATION_CHARGE_MIN });
            break;

        case 'range':
            if (service.complexityOptions && options?.complexityIndex !== undefined) {
                const selected = service.complexityOptions[options.complexityIndex];
                lineItems.push({ label: selected.label, amount: selected.price });
            } else {
                lineItems.push({ label: service.label, amount: service.basePrice });
            }
            break;
    }

    // Add-ons
    if (options?.addOns) {
        for (const addon of options.addOns) {
            if (addon.priceType === 'lab') {
                lineItems.push({ label: addon.label, amount: addon.basePrice });
                // Collection fee already included, only one applies
            } else {
                lineItems.push({ label: addon.label, amount: addon.basePrice });
            }
        }
    }

    const total = lineItems.reduce((sum, item) => sum + (item.isDiscount ? -item.amount : item.amount), 0);

    return { lineItems, total };
}

// ---------- Trust Elements ----------

export const TRUST_ELEMENTS = [
    { icon: 'Zap', label: 'Nurse in 15 mins' },
    { icon: 'ClipboardList', label: 'Lab reports < 2 hrs' },
    { icon: 'IndianRupee', label: 'Transparent Pricing' },
    { icon: 'Hospital', label: 'From ₹499' },
];

// ---------- Helpers ----------

export function findServiceById(serviceId: string): { category: ServiceCategory; service: ServiceOption } | null {
    for (const cat of SERVICE_CATEGORIES) {
        const svc = cat.services.find(s => s.id === serviceId);
        if (svc) return { category: cat, service: svc };
    }
    return null;
}

export function getDisplayPrice(service: ServiceOption): string {
    switch (service.priceType) {
        case 'flat':
            return `₹${service.basePrice}`;
        case 'lab':
            return `₹${service.basePrice + PRICING.COLLECTION_FEE}`;
        case 'calculated':
            return `From ₹${service.basePrice + PRICING.APPLICATION_CHARGE_MIN}`;
        case 'range':
            return `₹${service.basePrice} – ₹${service.maxPrice}`;
        default:
            return `₹${service.basePrice}`;
    }
}
