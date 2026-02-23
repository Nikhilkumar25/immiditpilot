/**
 * Prescription Service
 * Handles prescription generation, versioning, and follow-up task management.
 * PDF is generated client-side using jsPDF — server only stores structured data.
 */

import { prisma } from '../index';
import { logAudit } from './auditService';

interface MedicineEntry {
    name: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    timing: string;
    instructions: string;
}

/**
 * Generate a prescription for a given service.
 * Freezes vitals + nurse observations into a snapshot.
 */
export async function generatePrescription(
    serviceId: string,
    doctorId: string,
    data: {
        diagnosis: string;
        summaryNotes?: string;
        medicinesJson: MedicineEntry[];
        followUpInstruction?: string;
    },
) {
    // 1. Fetch clinical report
    const service = await prisma.serviceRequest.findUnique({
        where: { id: serviceId },
        include: {
            clinicalReport: true,
            doctorAction: true,
            patient: true,
        },
    });

    if (!service) throw new Error('Service request not found');
    if (!service.clinicalReport) throw new Error('Clinical report not found — nurse vitals required');
    if (!service.patient) throw new Error('Patient not found');

    // 2. Validate required fields
    const report = service.clinicalReport;
    const vitals = report.vitalsJson as any;

    if (!vitals || Object.keys(vitals).length === 0) {
        throw new Error('Vitals not recorded — cannot generate prescription');
    }
    if (!data.diagnosis || !data.diagnosis.trim()) {
        throw new Error('Diagnosis is required');
    }
    if (!data.medicinesJson || data.medicinesJson.length === 0) {
        throw new Error('At least one medicine must be added');
    }

    // Validate doctor registration (doctorId must exist)
    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new Error('Doctor not found');

    // 3. Check for existing prescription (for versioning)
    const existingPrescription = await prisma.prescription.findUnique({
        where: { clinicalReportId: report.id },
    });

    if (existingPrescription) {
        // ============ VERSIONING: Create new version, update prescription ============
        const newVersionNum = existingPrescription.versionNumber + 1;

        // Save old state as a version
        await prisma.prescriptionVersion.create({
            data: {
                prescriptionId: existingPrescription.id,
                versionNumber: existingPrescription.versionNumber,
                vitalsSnapshotJson: existingPrescription.vitalsSnapshotJson as any,
                nurseObservations: existingPrescription.nurseObservations,
                medicinesJson: existingPrescription.medicinesJson as any,
                diagnosis: existingPrescription.diagnosis,
                summaryNotes: existingPrescription.summaryNotes,
            },
        });

        // Update existing prescription (no pdfUrl — PDF generated client-side)
        const updatedPrescription = await prisma.prescription.update({
            where: { id: existingPrescription.id },
            data: {
                diagnosis: data.diagnosis,
                summaryNotes: data.summaryNotes || null,
                vitalsSnapshotJson: vitals,
                nurseObservations: report.nurseObservations,
                medicinesJson: data.medicinesJson as any,
                followUpInstruction: data.followUpInstruction || null,
                pdfUrl: null,
                versionNumber: newVersionNum,
            },
        });

        await logAudit(doctorId, 'PRESCRIPTION_VERSION_CREATED', 'Prescription', updatedPrescription.id);
        return updatedPrescription;
    }

    // ============ NEW PRESCRIPTION ============

    const prescriptionId = require('crypto').randomUUID();

    // Create prescription record (no pdfUrl — PDF generated client-side)
    const prescription = await prisma.prescription.create({
        data: {
            id: prescriptionId,
            serviceId,
            doctorId,
            patientId: service.patientId,
            clinicalReportId: report.id,
            diagnosis: data.diagnosis,
            summaryNotes: data.summaryNotes || null,
            vitalsSnapshotJson: vitals as any,
            nurseObservations: report.nurseObservations,
            medicinesJson: data.medicinesJson as any,
            followUpInstruction: data.followUpInstruction || null,
            pdfUrl: null,
            versionNumber: 1,
            patientNameSnapshot: service.patient.name,
            patientGenderSnapshot: service.patient.gender,
            patientDobSnapshot: service.patient.dateOfBirth,
        },
    });

    // Update ServiceRequest status
    await prisma.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'doctor_completed' as any },
    });

    // Create FollowUpTask if instruction is present
    if (data.followUpInstruction) {
        await prisma.followUpTask.create({
            data: {
                serviceId,
                patientId: service.patientId,
                prescriptionId: prescription.id,
                instruction: data.followUpInstruction,
                dueDate: service.doctorAction?.followupDate || null,
                status: 'pending',
            },
        });
    }

    // Audit log
    await logAudit(doctorId, 'PRESCRIPTION_GENERATED', 'Prescription', prescription.id);

    return prescription;
}

/**
 * Get prescription by service ID.
 */
export async function getPrescriptionByService(serviceId: string) {
    console.log('getPrescriptionByService called for:', serviceId);
    return prisma.prescription.findFirst({
        where: { serviceId },
        include: {
            doctor: true,
            versions: {
                orderBy: { versionNumber: 'desc' },
            },
        },
    });
}

/**
 * Get all follow-up tasks for a patient.
 */
export async function getPatientFollowUps(patientId: string) {
    return prisma.followUpTask.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
            service: {
                select: { serviceType: true, id: true },
            },
        },
    });
}
