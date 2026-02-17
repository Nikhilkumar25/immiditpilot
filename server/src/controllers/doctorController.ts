import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { getFlowConfig } from '../services/serviceFlowConfig';

export async function submitDoctorAction(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const {
            diagnosis,
            clinicalNotes,
            advice,
            medications,
            medicinesJson,
            prescriptionUrl,
            labRecommended,
            referralNote,
            followupDate,
            followupInstruction,
            // Emergency-specific fields
            emergencyAction,   // 'hospital_referral' | 'immediate_prescription' | 'continue_care'
            hospitalReferral,
            immediatePrescription,
            // Clinical History
            chiefComplaint,
            durationOfSymptoms,
            medicalHistory,
            allergies,
            currentMedications,
        } = req.body;
        const doctorId = req.user!.id;

        if (!diagnosis) {
            res.status(400).json({ error: 'Diagnosis is required' });
            return;
        }

        const service = await prisma.serviceRequest.findUnique({
            where: { id: serviceId },
            include: { clinicalReport: true },
        });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        // Guard: doctor cannot act before nurse report
        if (!service.clinicalReport) {
            res.status(400).json({ error: 'Cannot submit doctor action before nurse clinical report' });
            return;
        }

        if (service.status !== 'awaiting_doctor_review' && service.status !== 'awaiting_doctor_approval') {
            res.status(400).json({ error: 'Service must be in awaiting_doctor_review or awaiting_doctor_approval status' });
            return;
        }

        const existing = await prisma.doctorAction.findUnique({ where: { serviceId } });
        // Allow updating if it already exists (upsert logic)

        // ============ SERVICE-SPECIFIC VALIDATION ============
        const flowConfig = getFlowConfig(service.serviceType);

        // Emergency Assessment: must specify an action
        if (flowConfig?.isEmergency) {
            if (!emergencyAction || !['hospital_referral', 'immediate_prescription', 'continue_care'].includes(emergencyAction)) {
                res.status(400).json({
                    error: 'Emergency Assessment requires an explicit action: hospital_referral, immediate_prescription, or continue_care',
                });
                return;
            }
        }

        // Build referral note — combine with emergency action details
        let finalReferralNote = referralNote || null;
        if (flowConfig?.isEmergency && emergencyAction === 'hospital_referral') {
            finalReferralNote = hospitalReferral || referralNote || 'Hospital referral recommended';
        }

        // Create or update action and update status + doctorId
        const [action] = await prisma.$transaction([
            prisma.doctorAction.upsert({
                where: { serviceId },
                update: {
                    diagnosis,
                    clinicalNotes: clinicalNotes || null,
                    advice: advice || null,
                    medications: medications || null,
                    medicinesJson: medicinesJson || null,
                    prescriptionUrl: immediatePrescription || prescriptionUrl || null,
                    labRecommended: labRecommended || false,
                    referralNote: finalReferralNote,
                    followupDate: followupDate ? new Date(followupDate) : null,
                    followupInstruction: followupInstruction || null,
                },
                create: {
                    serviceId,
                    diagnosis,
                    clinicalNotes: clinicalNotes || null,
                    advice: advice || null,
                    medications: medications || null,
                    medicinesJson: medicinesJson || null,
                    prescriptionUrl: immediatePrescription || prescriptionUrl || null,
                    labRecommended: labRecommended || false,
                    referralNote: finalReferralNote,
                    followupDate: followupDate ? new Date(followupDate) : null,
                    followupInstruction: followupInstruction || null,
                },
            }),
            prisma.serviceRequest.update({
                where: { id: serviceId },
                data: {
                    status: 'doctor_completed' as any,
                    doctorId,
                },
            }),
            prisma.clinicalReport.update({
                where: { serviceId },
                data: {
                    chiefComplaint: chiefComplaint || undefined,
                    durationOfSymptoms: durationOfSymptoms || undefined,
                    medicalHistory: medicalHistory || undefined,
                    allergies: allergies || undefined,
                    currentMedications: currentMedications || undefined,
                },
            }),
        ]);

        await logAudit(doctorId, 'SUBMIT_DIAGNOSIS', 'DoctorAction', action.id);

        // Emit
        io.to(`service:${serviceId}`).emit('status_update', { serviceId, status: 'doctor_completed' });
        io.to(`user:${service.patientId}`).emit('prescription_uploaded', { serviceId });
        if (service.nurseId) io.to(`user:${service.nurseId}`).emit('status_update', { serviceId, status: 'doctor_completed' });
        io.to('role:admin').emit('status_update', { serviceId, status: 'doctor_completed' });

        res.status(201).json({
            ...action,
            emergencyAction: flowConfig?.isEmergency ? emergencyAction : undefined,
        });
    } catch (err) {
        console.error('Submit doctor action error:', err);
        res.status(500).json({ error: 'Failed to submit doctor action' });
    }
}

export async function approveProcedure(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const {
            notes,
            chiefComplaint,
            durationOfSymptoms,
            medicalHistory,
            allergies,
            currentMedications,
        } = req.body;
        const doctorId = req.user!.id;

        const service = await prisma.serviceRequest.findUnique({
            where: { id: serviceId },
            include: { clinicalReport: true },
        });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        if (service.status !== 'awaiting_doctor_approval' && service.status !== 'awaiting_doctor_review') {
            res.status(400).json({ error: 'Service is not in a state requiring approval' });
            return;
        }

        const [action] = await prisma.$transaction([
            prisma.doctorAction.upsert({
                where: { serviceId },
                update: {
                    procedureApproved: true,
                    approvalNotes: notes || null,
                    requestNurseEdit: false,
                },
                create: {
                    serviceId,
                    diagnosis: 'Pending Procedure Completion', // Placeholder until final action
                    procedureApproved: true,
                    approvalNotes: notes || null,
                    requestNurseEdit: false,
                }
            }),
            prisma.clinicalReport.update({
                where: { serviceId },
                data: {
                    chiefComplaint: chiefComplaint || undefined,
                    durationOfSymptoms: durationOfSymptoms || undefined,
                    medicalHistory: medicalHistory || undefined,
                    allergies: allergies || undefined,
                    currentMedications: currentMedications || undefined,
                },
            }),
        ]);

        await logAudit(doctorId, 'APPROVE_PROCEDURE', 'DoctorAction', action.id);

        // Notify nurse that procedure is approved
        io.to(`service:${serviceId}`).emit('procedure_approved', { serviceId, notes });
        if (service.nurseId) io.to(`user:${service.nurseId}`).emit('procedure_approved', { serviceId, notes });

        res.json({ message: 'Procedure approved', action });
    } catch (err) {
        console.error('Approve procedure error:', err);
        res.status(500).json({ error: 'Failed to approve procedure' });
    }
}

export async function requestNurseEdit(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const { notes } = req.body;
        const doctorId = req.user!.id;

        const service = await prisma.serviceRequest.findUnique({
            where: { id: serviceId },
            include: { clinicalReport: true },
        });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        const action = await prisma.doctorAction.upsert({
            where: { serviceId },
            update: {
                requestNurseEdit: true,
                approvalNotes: notes || null,
                procedureApproved: false,
            },
            create: {
                serviceId,
                diagnosis: 'Editing Requested',
                requestNurseEdit: true,
                approvalNotes: notes || null,
                procedureApproved: false,
            }
        });

        await logAudit(doctorId, 'REQUEST_NURSE_EDIT', 'DoctorAction', action.id);

        // Notify nurse to edit
        io.to(`service:${serviceId}`).emit('nurse_edit_requested', { serviceId, notes });
        if (service.nurseId) io.to(`user:${service.nurseId}`).emit('nurse_edit_requested', { serviceId, notes });

        res.json({ message: 'Nurse edit requested', action });
    } catch (err) {
        console.error('Request nurse edit error:', err);
        res.status(500).json({ error: 'Failed to request nurse edit' });
    }
}

export async function getDoctorAction(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const action = await prisma.doctorAction.findUnique({ where: { serviceId } });

        if (!action) {
            res.status(404).json({ error: 'Doctor action not found' });
            return;
        }

        res.json(action);
    } catch (err) {
        console.error('Get doctor action error:', err);
        res.status(500).json({ error: 'Failed to fetch doctor action' });
    }
}
