import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

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

        // Check existing report
        const existing = await prisma.clinicalReport.findUnique({ where: { serviceId } });
        if (existing) {
            res.status(409).json({ error: 'Clinical report already submitted for this case' });
            return;
        }

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
                data: { status: 'awaiting_doctor_review' as any },
            }),
        ]);

        await logAudit(nurseId, 'SUBMIT_VITALS', 'ClinicalReport', report.id);

        // Emit events
        io.to(`service:${serviceId}`).emit('vitals_submitted', { serviceId, triageLevel });
        io.to(`user:${service.patientId}`).emit('status_update', { serviceId, status: 'awaiting_doctor_review' });
        io.to('role:doctor').emit('vitals_submitted', { serviceId, triageLevel });
        io.to('role:admin').emit('vitals_submitted', { serviceId, triageLevel });

        res.status(201).json(report);
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
