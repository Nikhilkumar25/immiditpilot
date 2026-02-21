import { prisma } from '../index';

export async function logAudit(
    userId: string,
    actionType: string,
    entityType: string,
    entityId: string
): Promise<void> {
    await prisma.auditLog.create({
        data: {
            userId,
            actionType,
            entityType,
            entityId,
        },
    });
}
