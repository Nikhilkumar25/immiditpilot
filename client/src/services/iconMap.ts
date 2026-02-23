/**
 * Icon Map — resolves icon name strings to Lucide React components.
 * Used by components that receive icon names from config (patientDashboardConfig, ServiceFlowConfig).
 */

import {
    Stethoscope, Bandage, Syringe, Pill, Hospital, HeartHandshake,
    FlaskConical, Microscope, Thermometer, Droplets, Droplet, Dna,
    Baby, Dog, Ambulance, Siren, Zap, CheckCircle2, XCircle,
    AlertTriangle, Info, Phone, FileText, ClipboardEdit, Hand,
    IndianRupee, Lightbulb, Receipt, ShieldCheck, ClipboardList,
    Home, BarChart3, BedDouble, Footprints, UserRound, Activity,
    type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
    Stethoscope, Bandage, Syringe, Pill, Hospital, HeartHandshake,
    FlaskConical, Microscope, Thermometer, Droplets, Droplet, Dna,
    Baby, Dog, Ambulance, Siren, Zap, CheckCircle2, XCircle,
    AlertTriangle, Info, Phone, FileText, ClipboardEdit, Hand,
    IndianRupee, Lightbulb, Receipt, ShieldCheck, ClipboardList,
    Home, BarChart3, BedDouble, Footprints, UserRound, Activity,
};

/**
 * Resolve an icon name string to a Lucide React component.
 * Returns Stethoscope as fallback if the name is not found.
 */
export function getIcon(name: string): LucideIcon {
    return ICON_MAP[name] || Stethoscope;
}

export type { LucideIcon };
