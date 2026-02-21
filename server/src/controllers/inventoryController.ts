import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

// ═══════════════════════════════════════════
//  INVENTORY ITEMS
// ═══════════════════════════════════════════

export async function getInventoryItems(_req: AuthRequest, res: Response) {
    const data = await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
    res.json(data);
}

export async function createInventoryItem(req: AuthRequest, res: Response) {
    const item = await prisma.inventoryItem.create({ data: req.body });
    res.status(201).json(item);
}

export async function updateInventoryItem(req: AuthRequest, res: Response) {
    const item = await prisma.inventoryItem.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(item);
}

export async function deleteInventoryItem(req: AuthRequest, res: Response) {
    await prisma.inventoryItem.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  STOCK MOVEMENTS
// ═══════════════════════════════════════════

export async function getStockMovements(req: AuthRequest, res: Response) {
    const { itemId } = req.query;
    const where = itemId ? { itemId: itemId as string } : {};
    const data = await prisma.stockMovement.findMany({
        where,
        include: { item: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    res.json(data);
}

export async function createStockMovement(req: AuthRequest, res: Response) {
    const { itemId, type, quantity, reason } = req.body;

    const movement = await prisma.stockMovement.create({
        data: { itemId, type, quantity, reason, userId: req.user!.id },
    });

    // Update current stock
    const delta = type === 'IN' ? quantity : -quantity;
    await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: { increment: delta } },
    });

    res.status(201).json(movement);
}

// ═══════════════════════════════════════════
//  SERVICE CONSUMABLES (used by nurse during visit)
// ═══════════════════════════════════════════

export async function getServiceConsumables(req: AuthRequest, res: Response) {
    const data = await prisma.serviceConsumable.findMany({
        where: { serviceRequestId: req.params.serviceId as string },
        include: { item: true },
    });
    res.json(data);
}

export async function addServiceConsumable(req: AuthRequest, res: Response) {
    const { itemId, quantity } = req.body;
    const serviceRequestId = req.params.serviceId as string;

    // Get item price
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

    // Create consumable record
    const consumable = await prisma.serviceConsumable.create({
        data: {
            serviceRequestId,
            itemId,
            quantity,
            priceAtTime: item.salePrice,
        },
        include: { item: true },
    });

    // Deduct stock
    await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: { decrement: quantity } },
    });

    // Log movement
    await prisma.stockMovement.create({
        data: {
            itemId,
            type: 'OUT',
            quantity,
            reason: `Used in service ${serviceRequestId}`,
            userId: req.user!.id,
        },
    });

    res.status(201).json(consumable);
}

// ═══════════════════════════════════════════
//  LOW STOCK ALERT
// ═══════════════════════════════════════════

export async function getLowStockItems(_req: AuthRequest, res: Response) {
    const items = await prisma.inventoryItem.findMany({
        where: { active: true },
    });
    const lowStock = items.filter(i => i.currentStock <= i.reorderLevel);
    res.json(lowStock);
}
