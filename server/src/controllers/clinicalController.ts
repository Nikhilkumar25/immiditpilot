import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { validateNurseSubmission, canAutoClose, getFlowConfig } from '../services/serviceFlowConfig';

export async function submitClinicalReport(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const { vitalsJson, nurseNotes, triageLevel, attachments } = req.body;
        const nurseId = req.user!.id;

        if (!vitalsJson || !nurseNotes || !triageLevel) {
            res.status(400).json({ error: 'vitalsJson, nurseNotes, and triageLevel are required' });
            return;
        }

        const validLevels = ['mild', 'moderate', 'severe'];
        if (!validLevels.includes(triageLevel)) {
            res.status(400).json({ error: 'triageLevel must be mild, moderate, or severe' });
            return;
        }

        const service = await prisma.serviceRequest.findUnique({ where: { id: serviceId } });
        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        if (service.nurseId !== nurseId) {
            res.status(403).json({ error: 'You are not assigned to this case' });
            return;
        }

        // ============ SERVICE-SPECIFIC VALIDATION ============
        const validationErrors = validateNurseSubmission(
            service.serviceType,
            vitalsJson,
            attachments || [],
        );

        if (validationErrors.length > 0) {
            res.status(400).json({
                error: 'Validation failed for service-specific requirements',
                details: validationErrors,
            });
            return;
        }

        // Check existing report
        const existing = await prisma.clinicalReport.findUnique({ where: { serviceId } });
        if (existing) {
            res.status(409).json({ error: 'Clinical report already submitted for this case' });
            return;
        }

        // Determine next status: auto-close for Injection with no reaction, else await doctor
        const shouldAutoClose = canAutoClose(service.serviceType, vitalsJson);
        const nextStatus = shouldAutoClose ? 'doctor_completed' : 'awaiting_doctor_review';

        // Create report and update status in transaction
        const [report] = await prisma.$transaction([
            prisma.clinicalReport.create({
                data: {
                    serviceId,
                    vitalsJson,
                    nurseNotes,
                    triageLevel: triageLevel as any,
                    attachments: attachments || [],
                },
            }),
            prisma.serviceRequest.update({
                where: { id: serviceId },
                data: { status: nextStatus as any },
            }),
        ]);

        await logAudit(nurseId, 'SUBMIT_VITALS', 'ClinicalReport', report.id);

        // Emit events
        io.to(`service:${serviceId}`).emit('vitals_submitted', { serviceId, triageLevel });
        io.to(`user:${service.patientId}`).emit('status_update', { serviceId, status: nextStatus });

        if (shouldAutoClose) {
            // Injection auto-closed — notify everyone
            io.to(`user:${service.patientId}`).emit('status_update', { serviceId, status: 'doctor_completed' });
            io.to('role:admin').emit('status_update', { serviceId, status: 'doctor_completed' });
        } else {
            // Normal flow — alert doctor
            io.to('role:doctor').emit('vitals_submitted', { serviceId, triageLevel });
            io.to('role:admin').emit('vitals_submitted', { serviceId, triageLevel });

            // Emergency priority alert
            const flowConfig = getFlowConfig(service.serviceType);
            if (flowConfig?.isEmergency) {
                io.to('role:doctor').emit('emergency_alert_triggered', {
                    serviceId,
                    serviceType: service.serviceType,
                    severity: 'URGENT',
                    message: `🚨 Emergency vitals submitted. Immediate review required.`,
                });
            }
        }

        res.status(201).json({
            ...report,
            autoClosedNote: shouldAutoClose
                ? 'Routine injection with no adverse reaction — case auto-forwarded.'
                : undefined,
        });
    } catch (err) {
        console.error('Submit clinical report error:', err);
        res.status(500).json({ error: 'Failed to submit clinical report' });
    }
}

export async function getClinicalReport(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const report = await prisma.clinicalReport.findUnique({
            where: { serviceId },
        });

        if (!report) {
            res.status(404).json({ error: 'Clinical report not found' });
            return;
        }

        res.json(report);
    } catch (err) {
        console.error('Get clinical report error:', err);
        res.status(500).json({ error: 'Failed to fetch clinical report' });
    }
}
