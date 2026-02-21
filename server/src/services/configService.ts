import { prisma } from '../index';

export interface SystemConfigValues {
    pricing: {
        visitFee: number;
        collectionFee: number;
        consultationFee: number; // For doctor requests
    };
    features: {
        videoConsultation: boolean;
        sosSpatialTracking: boolean;
        autoClosureEnabled: boolean;
    };
    serviceAvailability: Record<string, boolean>;
}

const DEFAULT_CONFIG: SystemConfigValues = {
    pricing: {
        visitFee: 499,
        collectionFee: 49,
        consultationFee: 199,
    },
    features: {
        videoConsultation: false,
        sosSpatialTracking: false,
        autoClosureEnabled: true,
    },
    serviceAvailability: {
        'General Checkup': true,
        'Wound Dressing': true,
        'IV Therapy': true,
        'Injection': true,
        'Post-Operative Care': true,
        'Elderly Care': true,
        'Pediatric Nursing': true,
        'Catheter Care': true,
        'Emergency Assessment': true,
    }
};

export async function getConfig(): Promise<SystemConfigValues> {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'main_config' }
        });
        
        if (!config) return DEFAULT_CONFIG;
        
        return {
            ...DEFAULT_CONFIG,
            ...(config.value as any)
        };
    } catch (err) {
        console.error('Error fetching config:', err);
        return DEFAULT_CONFIG;
    }
}

export async function setConfig(values: Partial<SystemConfigValues>): Promise<SystemConfigValues> {
    const current = await getConfig();
    const updated = {
        ...current,
        ...values,
        pricing: { ...current.pricing, ...values.pricing },
        features: { ...current.features, ...values.features },
        serviceAvailability: { ...current.serviceAvailability, ...values.serviceAvailability }
    };

    await prisma.systemConfig.upsert({
        where: { key: 'main_config' },
        update: { value: updated as any },
        create: { key: 'main_config', value: updated as any }
    });

    return updated;
}
