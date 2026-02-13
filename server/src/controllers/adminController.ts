import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

export async function getKpis(req: AuthRequest, res: Response): Promise<void> {
    try {
        const totalCases = await prisma.serviceRequest.count();
        const completedCases = await prisma.serviceRequest.count({ where: { status: 'completed' } });
        const activeCases = await prisma.serviceRequest.count({
            where: { status: { notIn: ['completed', 'cancelled'] as any } },
        });
        const cancelledCases = await prisma.serviceRequest.count({ where: { status: 'cancelled' } });

        // Lab stats
        const totalLabOrders = await prisma.labOrder.count();
        const closedLabOrders = await prisma.labOrder.count({ where: { status: 'lab_closed' } });

        // Calculate averages from completed cases
        const completedServices = await prisma.serviceRequest.findMany({
            where: { status: 'completed' },
            select: { createdAt: true, updatedAt: true },
        });

        let avgCompletionTimeHours = 0;
        if (completedServices.length > 0) {
            const totalMs = completedServices.reduce((sum, s) => {
                return sum + (s.updatedAt.getTime() - s.createdAt.getTime());
            }, 0);
            avgCompletionTimeHours = Math.round((totalMs / completedServices.length / (1000 * 60 * 60)) * 10) / 10;
        }

        // Users by role
        const nurses = await prisma.user.count({ where: { role: 'nurse' } });
        const doctors = await prisma.user.count({ where: { role: 'doctor' } });
        const patients = await prisma.user.count({ where: { role: 'patient' } });

        res.json({
            totalCases,
            completedCases,
            activeCases,
            cancelledCases,
            totalLabOrders,
            closedLabOrders,
            labConversionRate: totalCases > 0 ? Math.round((totalLabOrders / totalCases) * 100) : 0,
            avgCompletionTimeHours,
            users: { nurses, doctors, patients },
        });
    } catch (err) {
        console.error('KPI error:', err);
        res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
}

export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { role } = req.query;
        const where = role ? { role: role as any } : {};
        const users = await prisma.user.findMany({
            where,
            select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
        const logs = await prisma.auditLog.findMany({
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
}
