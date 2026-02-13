import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export async function submitDoctorAction(req: AuthRequest, res: Response): Promise<void> {
    try {
        const serviceId = req.params.serviceId as string;
        const { diagnosis, prescriptionUrl, labRecommended, referralNote, followupDate } = req.body;
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

        if (service.status !== 'awaiting_doctor_review') {
            res.status(400).json({ error: 'Service must be in awaiting_doctor_review status' });
            return;
        }

        const existing = await prisma.doctorAction.findUnique({ where: { serviceId } });
        if (existing) {
            res.status(409).json({ error: 'Doctor action already submitted for this case' });
            return;
        }

        // Create action and update status + doctorId
        const [action] = await prisma.$transaction([
            prisma.doctorAction.create({
                data: {
                    serviceId,
                    diagnosis,
                    prescriptionUrl: prescriptionUrl || null,
                    labRecommended: labRecommended || false,
                    referralNote: referralNote || null,
                    followupDate: followupDate ? new Date(followupDate) : null,
                },
            }),
            prisma.serviceRequest.update({
                where: { id: serviceId },
                data: {
                    status: 'doctor_completed' as any,
                    doctorId,
                },
            }),
        ]);

        await logAudit(doctorId, 'SUBMIT_DIAGNOSIS', 'DoctorAction', action.id);

        // Emit
        io.to(`service:${serviceId}`).emit('status_update', { serviceId, status: 'doctor_completed' });
        io.to(`user:${service.patientId}`).emit('prescription_uploaded', { serviceId });
        if (service.nurseId) io.to(`user:${service.nurseId}`).emit('status_update', { serviceId, status: 'doctor_completed' });
        io.to('role:admin').emit('status_update', { serviceId, status: 'doctor_completed' });

        res.status(201).json(action);
    } catch (err) {
        console.error('Submit doctor action error:', err);
        res.status(500).json({ error: 'Failed to submit doctor action' });
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
