import { Response } from 'express';
import { prisma, getServerIO } from '../index';
import { AuthRequest } from '../middleware/auth';
import { canTransitionService, hasLabPending } from '../services/statusEngine';
import { logAudit } from '../services/auditService';
import { VALID_SERVICE_TYPES, getFlowConfig, SERVICE_FLOW_CONFIG } from '../services/serviceFlowConfig';
import { calculateDistanceKm } from '../utils/geoUtils';

export async function createServiceRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
        const {
            serviceType, serviceCategory, symptoms, location, locationDetails,
            scheduledTime, isImmediate, addressId,
            hasProvidedMedication, requiredMedicationId, requiredMedicationName, medicationCost
        } = req.body;
        const patientId = req.user!.id;

        if (!serviceType || !symptoms || !location || !scheduledTime) {
            res.status(400).json({ error: 'All fields required: serviceType, symptoms, location, scheduledTime' });
            return;
        }

        // Validate service type
        if (!VALID_SERVICE_TYPES.includes(serviceType)) {
            res.status(400).json({ error: `Invalid service type: ${serviceType}. Valid types: ${VALID_SERVICE_TYPES.join(', ')}` });
            return;
        }

        // --- ENFORCE GEOFENCING ---
        let reqLat: number | null = null;
        let reqLng: number | null = null;

        if (addressId) {
            const savedAddress = await prisma.savedAddress.findUnique({ where: { id: addressId } });
            if (savedAddress && savedAddress.lat && savedAddress.lng) {
                reqLat = savedAddress.lat;
                reqLng = savedAddress.lng;
            }
        } else if (locationDetails && typeof locationDetails === 'object' && locationDetails.lat && locationDetails.lng) {
            reqLat = locationDetails.lat;
            reqLng = locationDetails.lng;
        }

        if (reqLat !== null && reqLng !== null) {
            const activeZones = await prisma.zone.findMany({ where: { active: true } });
            if (activeZones.length === 0) {
                res.status(400).json({ error: 'Sorry, this location is outside our currently serviceable areas.' });
                return;
            }

            let isInsideAnyZone = false;
            for (const zone of activeZones) {
                const dist = calculateDistanceKm(reqLat, reqLng, zone.centerLat, zone.centerLng);
                if (dist <= zone.radiusKm) {
                    isInsideAnyZone = true;
                    break;
                }
            }

            if (!isInsideAnyZone) {
                res.status(400).json({ error: 'Sorry, this location is outside our currently serviceable areas.' });
                return;
            }
        } else {
            // Optional: You could reject requests without coordinates if strict geofencing is required.
            // For now, if coordinates can't be found (rare), it proceeds to avoid breaking legacy addresses.
        }
        // --------------------------

        // --- ENFORCE BOOKING LIMITS ---
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // 1. Max 4 bookings per day
        const dailyBookingsCount = await prisma.serviceRequest.count({
            where: {
                patientId,
                createdAt: { gte: startOfDay },
            },
        });

        if (dailyBookingsCount >= 4) {
            res.status(400).json({ error: 'You have reached the maximum limit of 4 bookings per day.' });
            return;
        }

        // 2. Max 2 active bookings at any given time (e.g., 1 ongoing + 1 scheduled)
        const activeBookingsCount = await prisma.serviceRequest.count({
            where: {
                patientId,
                status: { notIn: ['completed', 'cancelled'] as any },
            },
        });

        if (activeBookingsCount >= 2) {
            res.status(400).json({ error: 'You already have 2 active bookings. Please wait for them to complete before booking another.' });
            return;
        }
        // ------------------------------

        // Compute scheduledEndTime (20-min slot)
        const startTime = new Date(scheduledTime);
        const endTime = new Date(startTime.getTime() + 20 * 60 * 1000);

        // Server-side slot validation (skip for immediate bookings)
        if (!isImmediate) {
            const hours = startTime.getHours();
            const minutes = startTime.getMinutes();
            if (hours < 8 || hours >= 20) {
                res.status(400).json({ error: 'Bookings are only available between 8:00 AM and 8:00 PM.' });
                return;
            }
            if (minutes % 20 !== 0) {
                res.status(400).json({ error: 'Please select a valid 20-minute time slot (e.g., 8:00, 8:20, 8:40).' });
                return;
            }
        }

        // Auto-set serviceCategory from serviceType if not provided
        const category = serviceCategory || serviceType;

        const flowConfig = getFlowConfig(serviceType);

        const service = await prisma.serviceRequest.create({
            data: {
                patientId,
                serviceType,
                serviceCategory: category,
                symptoms,
                location,
                locationDetails,
                isImmediate: isImmediate || false,
                addressId,
                scheduledTime: startTime,
                scheduledEndTime: endTime,
                status: 'pending_nurse_assignment',
                hasProvidedMedication,
                requiredMedicationId,
                requiredMedicationName,
                medicationCost
            } as any,
            include: { patient: { select: { id: true, name: true, phone: true, email: true, role: true } } },
        });

        await logAudit(patientId, 'CREATE', 'ServiceRequest', service.id);

        // Emit to admin room
        getServerIO().to('role:admin').emit('new_service_request', service);
        getServerIO().to(`user:${patientId}`).emit('status_update', { serviceId: service.id, status: service.status });

        // Emit slot_confirmed event
        getServerIO().to(`user:${patientId}`).emit('slot_confirmed', {
            serviceId: service.id,
            scheduledTime: startTime.toISOString(),
            scheduledEndTime: endTime.toISOString(),
        });

        // Emergency Assessment: alert doctors immediately
        if (flowConfig?.isEmergency) {
            getServerIO().to('role:doctor').emit('emergency_alert_triggered', {
                serviceId: service.id,
                serviceType,
                patientName: (service as any).patient?.name,
                severity: 'URGENT',
                message: `🚨 Emergency Assessment requested by ${(service as any).patient?.name}. Immediate review required.`,
            });
            getServerIO().to('role:admin').emit('emergency_alert_triggered', {
                serviceId: service.id,
                serviceType,
                patientName: (service as any).patient?.name,
            });
        }

        res.status(201).json(service);
    } catch (err) {
        console.error('Create service error:', err);
        res.status(500).json({ error: 'Failed to create service request' });
    }
}

/**
 * Check if instant care is available (any nurse free with no active cases).
 */
export async function checkInstantCareAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
        // Find all nurses
        const nurses = await prisma.user.findMany({
            where: { role: 'nurse' },
            select: { id: true, name: true },
        });

        if (nurses.length === 0) {
            res.json({ available: false, message: 'No nurses registered in the system.' });
            return;
        }

        // For each nurse, check if they have any active (non-completed/cancelled) case
        const nurseIds = nurses.map(n => n.id);
        const activeCases = await prisma.serviceRequest.groupBy({
            by: ['nurseId'],
            where: {
                nurseId: { in: nurseIds },
                status: { notIn: ['completed', 'cancelled'] as any },
            },
            _count: { id: true },
        });

        const busyNurseIds = new Set(activeCases.map(c => c.nurseId));
        const freeNurses = nurses.filter(n => !busyNurseIds.has(n.id));

        if (freeNurses.length > 0) {
            res.json({
                available: true,
                message: 'Nurse can arrive in approx. 20–30 minutes.',
                freeNurseCount: freeNurses.length,
            });
        } else {
            res.json({
                available: false,
                message: 'Instant care currently unavailable. Please choose a time slot.',
            });
        }
    } catch (err) {
        console.error('Check instant care error:', err);
        res.status(500).json({ error: 'Failed to check instant care availability' });
    }
}

/**
 * Return the flow config for a given service type (used by frontend).
 */
export async function getFlowConfigEndpoint(req: AuthRequest, res: Response): Promise<void> {
    const serviceType = req.params.serviceType as string;
    const config = getFlowConfig(serviceType);
    if (!config) {
        res.status(404).json({ error: `Unknown service type: ${serviceType}` });
        return;
    }
    res.json(config);
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
                prescriptions: { include: { doctor: true }, orderBy: { createdAt: 'desc' }, take: 1 },
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
                savedAddress: true,
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
                prescriptions: { include: { doctor: true }, orderBy: { createdAt: 'desc' }, take: 1 },
                savedAddress: true,
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
        getServerIO().to(`service:${id}`).emit('status_update', { serviceId: id, status: newStatus });
        if (updated.patientId) getServerIO().to(`user:${updated.patientId}`).emit('status_update', { serviceId: id, status: newStatus });
        if (updated.nurseId) getServerIO().to(`user:${updated.nurseId}`).emit('status_update', { serviceId: id, status: newStatus });
        if (updated.doctorId) getServerIO().to(`user:${updated.doctorId}`).emit('status_update', { serviceId: id, status: newStatus });
        getServerIO().to('role:admin').emit('status_update', { serviceId: id, status: newStatus });

        // Emit navigation_started + ETA when nurse goes en route
        if (newStatus === 'nurse_on_the_way') {
            getServerIO().to(`user:${updated.patientId}`).emit('navigation_started', { serviceId: id, nurseName: updated.nurse?.name });
            getServerIO().to(`user:${updated.patientId}`).emit('nurse_arrival_estimated', {
                serviceId: id,
                estimatedMinutes: 20,
                message: `${updated.nurse?.name || 'Your nurse'} is on the way. Estimated arrival: ~20 minutes.`,
            });
        }

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

        getServerIO().to(`user:${updated.patientId}`).emit('nurse_assigned', { serviceId: id, nurse: updated.nurse });
        getServerIO().to(`user:${nurseId}`).emit('nurse_assigned', { serviceId: id });
        getServerIO().to('role:admin').emit('nurse_assigned', { serviceId: id, nurse: updated.nurse });

        res.json(updated);
    } catch (err) {
        console.error('Assign nurse error:', err);
        res.status(500).json({ error: 'Failed to assign nurse' });
    }
}

export async function cancelService(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const service = await prisma.serviceRequest.findUnique({ where: { id } });

        if (!service) {
            res.status(404).json({ error: 'Service request not found' });
            return;
        }

        // Only allow patient to cancel their own, or admin
        if (service.patientId !== userId && req.user!.role !== 'admin') {
            res.status(403).json({ error: 'Not authorized to cancel this service' });
            return;
        }

        const cancellableStatuses = ['pending_nurse_assignment', 'nurse_assigned'];
        if (!cancellableStatuses.includes(service.status)) {
            res.status(400).json({ error: `Cannot cancel service in "${service.status}" status. Cancellation only allowed before nurse is en route.` });
            return;
        }

        const updated = await prisma.serviceRequest.update({
            where: { id },
            data: { status: 'cancelled' as any },
            include: {
                patient: { select: { id: true, name: true } },
                nurse: { select: { id: true, name: true } },
            },
        });

        await logAudit(userId, 'CANCEL', 'ServiceRequest', id);

        getServerIO().to(`user:${updated.patientId}`).emit('status_update', { serviceId: id, status: 'cancelled' });
        if (updated.nurseId) getServerIO().to(`user:${updated.nurseId}`).emit('status_update', { serviceId: id, status: 'cancelled' });
        getServerIO().to('role:admin').emit('status_update', { serviceId: id, status: 'cancelled' });

        res.json(updated);
    } catch (err) {
        console.error('Cancel service error:', err);
        res.status(500).json({ error: 'Failed to cancel service request' });
    }
}

export async function getNurseStats(req: AuthRequest, res: Response): Promise<void> {
    try {
        const nurseId = req.user!.id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const completedToday = await prisma.serviceRequest.count({
            where: {
                nurseId,
                status: 'completed',
                updatedAt: { gte: startOfDay },
            },
        });

        res.json({ completedToday });
    } catch (err) {
        console.error('Get nurse stats error:', err);
        res.status(500).json({ error: 'Failed to fetch nurse stats' });
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
