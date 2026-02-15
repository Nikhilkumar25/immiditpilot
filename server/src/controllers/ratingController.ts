import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

export async function submitRating(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { serviceId, toUserId, score, category, comment } = req.body;
        const fromUserId = req.user!.id;

        if (!serviceId || !toUserId || !score) {
            res.status(400).json({ error: 'serviceId, toUserId, and score are required' });
            return;
        }

        // Verify service exists and users are participants
        const service = await prisma.serviceRequest.findUnique({
            where: { id: serviceId },
            include: { clinicalReport: true }
        });

        if (!service) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        const participants = [service.patientId, service.nurseId, service.doctorId];
        if (!participants.includes(fromUserId) || !participants.includes(toUserId)) {
            res.status(403).json({ error: 'You are not a participant in this service' });
            return;
        }

        const rating = await (prisma as any).rating.create({
            data: {
                serviceId,
                fromUserId,
                toUserId,
                score: Number(score),
                category,
                comment,
            }
        });

        res.json({ message: 'Rating submitted successfully', rating });
    } catch (err) {
        console.error('Submit rating error:', err);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
}

export async function getRatingsForUser(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { userId } = req.params;
        const ratings = await (prisma as any).rating.findMany({
            where: { toUserId: userId },
            include: {
                fromUser: { select: { name: true, role: true } },
                service: { select: { serviceType: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(ratings);
    } catch (err) {
        console.error('Get ratings error:', err);
        res.status(500).json({ error: 'Failed to fetch ratings' });
    }
}
