/**
 * Prescription Controller
 * Handles HTTP endpoints for prescription generation, retrieval, and PDF serving.
 */

import { Response } from 'express';
import { prisma, getServerIO } from '../index';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import {
    generatePrescription,
    getPrescriptionByService,
    getPatientFollowUps,
} from '../services/prescriptionService';

/**
 * POST /api/services/:serviceId/prescription/generate
 * Doctor generates a prescription for a service.
 */
export async function handleGeneratePrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const doctorId = req.user!.id;
        const { diagnosis, summaryNotes, medicinesJson, followUpInstruction } = req.body;

        // Validation
        if (!diagnosis || !diagnosis.trim()) {
            res.status(400).json({ error: 'Diagnosis is required' });
            return;
        }
        if (!medicinesJson || !Array.isArray(medicinesJson) || medicinesJson.length === 0) {
            res.status(400).json({ error: 'At least one medicine must be added' });
            return;
        }

        // Validate each medicine entry
        for (const med of medicinesJson) {
            if (!med.name || !med.dosage || !med.frequency) {
                res.status(400).json({ error: 'Each medicine must have name, dosage, and frequency' });
                return;
            }
        }

        // Validate vitals + nurse observations exist
        const service = await prisma.serviceRequest.findUnique({
            where: { id: serviceId },
            include: { clinicalReport: true },
        });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        if (!service.clinicalReport) {
            res.status(400).json({ error: 'No clinical report / vitals recorded — cannot generate prescription' });
            return;
        }

        const vitals = service.clinicalReport.vitalsJson as any;
        if (!vitals || Object.keys(vitals).length === 0) {
            res.status(400).json({ error: 'No vitals recorded' });
            return;
        }

        const prescription = await generatePrescription(serviceId, doctorId, {
            diagnosis,
            summaryNotes,
            medicinesJson,
            followUpInstruction,
        });

        // Emit events
        getServerIO().to(`service:${serviceId}`).emit('prescription_generated', { serviceId, prescriptionId: prescription.id });
        getServerIO().to(`user:${service.patientId}`).emit('prescription_uploaded', { serviceId, pdfUrl: prescription.pdfUrl });

        res.status(201).json(prescription);
    } catch (err: any) {
        console.error('Generate prescription error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate prescription' });
    }
}

/**
 * GET /api/services/:serviceId/prescription
 * Get prescription for a service (includes versions).
 */
export async function handleGetPrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const prescription = await getPrescriptionByService(serviceId);

        if (!prescription) {
            res.status(404).json({ error: 'Prescription not found' });
            return;
        }

        res.json(prescription);
    } catch (err: any) {
        console.error('Get prescription error:', err);
        res.status(500).json({ error: 'Failed to fetch prescription' });
    }
}

/**
 * GET /api/patients/:patientId/follow-ups
 * Get follow-up tasks for a patient.
 */
export async function handleGetFollowUps(req: AuthRequest, res: Response): Promise<void> {
    try {
        const patientId = req.params.patientId as string;
        const followUps = await getPatientFollowUps(patientId);
        res.json(followUps);
    } catch (err) {
        console.error('Get follow-ups error:', err);
        res.status(500).json({ error: 'Failed to fetch follow-up tasks' });
    }
}
