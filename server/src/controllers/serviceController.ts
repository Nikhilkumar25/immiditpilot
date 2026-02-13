import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { canTransitionService, hasLabPending } from '../services/statusEngine';
import { logAudit } from '../services/auditService';

export async function createServiceRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { serviceType, serviceCategory, symptoms, location, locationDetails, scheduledTime, isImmediate, addressId } = req.body;
        const patientId = req.user!.id;

        if (!serviceType || !symptoms || !location || !scheduledTime) {
            res.status(400).json({ error: 'All fields required: serviceType, symptoms, location, scheduledTime' });
            return;
        }

        const service = await prisma.serviceRequest.create({
            data: {
                patientId,
                serviceType,
                serviceCategory,
                symptoms,
                location,
                locationDetails,
                isImmediate: isImmediate || false,
                addressId,
                scheduledTime: new Date(scheduledTime),
                status: 'pending_nurse_assignment'
            },
            include: { patient: { select: { id: true, name: true, phone: true, email: true, role: true } } },
        });

        await logAudit(patientId, 'CREATE', 'ServiceRequest', service.id);

        // Emit to admin room
        io.to('role:admin').emit('new_service_request', service);
        io.to(`user:${patientId}`).emit('status_update', { serviceId: service.id, status: service.status });

        res.status(201).json(service);
    } catch (err) {
        console.error('Create service error:', err);
        res.status(500).json({ error: 'Failed to create service request' });
    }
}

export async function getMyServiceRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
        const services = await prisma.serviceRequest.findMany({
            where: { patientId: req.user!.id },
            include: {
                nurse: { select: { id: true, name: true, phone: true } },
                doctor: { select: { id: true, name: true } },
                clinicalReport: true,
                doctorAction: true,
                labOrders: { include: { labReport: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(services);
    } catch (err) {
        console.error('Get my services error:', err);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
}

export async function getAssignedCases(req: AuthRequest, res: Response): Promise<void> {
    try {
        const services = await prisma.serviceRequest.findMany({
            where: {
                nurseId: req.user!.id,
                status: { notIn: ['completed', 'cancelled'] as any },
            },
            include: {
                patient: { select: { id: true, name: true, phone: true, email: true } },
                clinicalReport: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(services);
    } catch (err) {
        console.error('Get assigned cases error:', err);
        res.status(500).json({ error: 'Failed to fetch assigned cases' });
    }
}

export async function getPendingReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
        const services = await prisma.serviceRequest.findMany({
            where: {
                OR: [
                    { doctorId: req.user!.id },
                    { status: 'awaiting_doctor_review' as any, doctorId: null },
                ],
                status: { notIn: ['completed', 'cancelled'] as any },
            },
            include: {
                patient: { select: { id: true, name: true, phone: true } },
                nurse: { select: { id: true, name: true } },
                clinicalReport: true,
                doctorAction: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(services);
    } catch (err) {
        console.error('Get pending reviews error:', err);
        res.status(500).json({ error: 'Failed to fetch pending reviews' });
    }
}

export async function getServiceById(req: AuthRequest, res: Response): Promise<void> {
    try {
        const service = await prisma.serviceRequest.findUnique({
            where: { id: req.params.id as string },
            include: {
                patient: { select: { id: true, name: true, phone: true, email: true } },
                nurse: { select: { id: true, name: true, phone: true } },
                doctor: { select: { id: true, name: true } },
                clinicalReport: true,
                doctorAction: true,
                labOrders: { include: { labReport: true } },
            },
        });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        res.json(service);
    } catch (err) {
        console.error('Get service error:', err);
        res.status(500).json({ error: 'Failed to fetch service request' });
    }
}

export async function updateServiceStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { status: newStatus } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const service = await prisma.serviceRequest.findUnique({
            where: { id },
            include: { labOrders: true },
        });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        // Validate transition
        if (!canTransitionService(service.status, newStatus, userRole)) {
            res.status(400).json({ error: `Invalid status transition: ${service.status} → ${newStatus} (role: ${userRole})` });
            return;
        }

        // Guard: cannot complete if lab is pending
        if (newStatus === 'completed' && hasLabPending(service.labOrders || [])) {
            res.status(400).json({ error: 'Cannot complete case with pending lab orders' });
            return;
        }

        const updated = await prisma.serviceRequest.update({
            where: { id },
            data: { status: newStatus as any },
            include: {
                patient: { select: { id: true, name: true } },
                nurse: { select: { id: true, name: true } },
                doctor: { select: { id: true, name: true } },
            },
        });

        await logAudit(userId, `STATUS_${newStatus.toUpperCase()}`, 'ServiceRequest', id);

        // Emit real-time update
        io.to(`service:${id}`).emit('status_update', { serviceId: id, status: newStatus });
        if (updated.patientId) io.to(`user:${updated.patientId}`).emit('status_update', { serviceId: id, status: newStatus });
        if (updated.nurseId) io.to(`user:${updated.nurseId}`).emit('status_update', { serviceId: id, status: newStatus });
        if (updated.doctorId) io.to(`user:${updated.doctorId}`).emit('status_update', { serviceId: id, status: newStatus });
        io.to('role:admin').emit('status_update', { serviceId: id, status: newStatus });

        res.json(updated);
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
}

export async function assignNurse(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { nurseId } = req.body;

        if (!nurseId) {
            res.status(400).json({ error: 'nurseId is required' });
            return;
        }

        const nurse = await prisma.user.findFirst({ where: { id: nurseId, role: 'nurse' } });
        if (!nurse) {
            res.status(404).json({ error: 'Nurse not found' });
            return;
        }

        const service = await prisma.serviceRequest.findUnique({ where: { id } });
        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        if (service.status !== 'pending_nurse_assignment') {
            res.status(400).json({ error: 'Can only assign nurse when status is pending_nurse_assignment' });
            return;
        }

        const updated = await prisma.serviceRequest.update({
            where: { id },
            data: { nurseId, status: 'nurse_assigned' as any },
            include: {
                patient: { select: { id: true, name: true } },
                nurse: { select: { id: true, name: true, phone: true } },
            },
        });

        await logAudit(req.user!.id, 'ASSIGN_NURSE', 'ServiceRequest', id);

        io.to(`user:${updated.patientId}`).emit('nurse_assigned', { serviceId: id, nurse: updated.nurse });
        io.to(`user:${nurseId}`).emit('nurse_assigned', { serviceId: id });
        io.to('role:admin').emit('nurse_assigned', { serviceId: id, nurse: updated.nurse });

        res.json(updated);
    } catch (err) {
        console.error('Assign nurse error:', err);
        res.status(500).json({ error: 'Failed to assign nurse' });
    }
}

export async function getAllServices(req: AuthRequest, res: Response): Promise<void> {
    try {
        const services = await prisma.serviceRequest.findMany({
            include: {
                patient: { select: { id: true, name: true, phone: true } },
                nurse: { select: { id: true, name: true } },
                doctor: { select: { id: true, name: true } },
                clinicalReport: true,
                doctorAction: true,
                labOrders: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(services);
    } catch (err) {
        console.error('Get all services error:', err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
}
