import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

// ═══════════════════════════════════════════
//  SERVICES
// ═══════════════════════════════════════════

export async function getServices(_req: AuthRequest, res: Response) {
    const data = await prisma.cmsService.findMany({ orderBy: { order: 'asc' } });
    res.json(data);
}

export async function createService(req: AuthRequest, res: Response) {
    const svc = await prisma.cmsService.create({ data: req.body });
    await audit(req.user!.id, 'CREATE', 'CmsService', svc.id);
    res.status(201).json(svc);
}

export async function updateService(req: AuthRequest, res: Response) {
    const svc = await prisma.cmsService.update({ where: { id: req.params.id as string }, data: req.body });
    await audit(req.user!.id, 'UPDATE', 'CmsService', svc.id);
    res.json(svc);
}

export async function deleteService(req: AuthRequest, res: Response) {
    await prisma.cmsService.delete({ where: { id: req.params.id as string } });
    await audit(req.user!.id, 'DELETE', 'CmsService', req.params.id as string);
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  DYNAMIC PRICING
// ═══════════════════════════════════════════

export async function getPricingRules(_req: AuthRequest, res: Response) {
    const data = await prisma.dynamicPricingRule.findMany({ include: { service: true, zone: true }, orderBy: { createdAt: 'desc' } });
    res.json(data);
}

export async function createPricingRule(req: AuthRequest, res: Response) {
    const rule = await prisma.dynamicPricingRule.create({ data: req.body });
    await audit(req.user!.id, 'CREATE', 'DynamicPricingRule', rule.id);
    res.status(201).json(rule);
}

export async function updatePricingRule(req: AuthRequest, res: Response) {
    const rule = await prisma.dynamicPricingRule.update({ where: { id: req.params.id as string }, data: req.body });
    await audit(req.user!.id, 'UPDATE', 'DynamicPricingRule', rule.id);
    res.json(rule);
}

export async function deletePricingRule(req: AuthRequest, res: Response) {
    await prisma.dynamicPricingRule.delete({ where: { id: req.params.id as string } });
    await audit(req.user!.id, 'DELETE', 'DynamicPricingRule', req.params.id as string);
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  ZONES
// ═══════════════════════════════════════════

export async function getZones(_req: AuthRequest, res: Response) {
    const data = await prisma.zone.findMany({ orderBy: { name: 'asc' } });
    res.json(data);
}

export async function createZone(req: AuthRequest, res: Response) {
    const zone = await prisma.zone.create({ data: req.body });
    await audit(req.user!.id, 'CREATE', 'Zone', zone.id);
    res.status(201).json(zone);
}

export async function updateZone(req: AuthRequest, res: Response) {
    const zone = await prisma.zone.update({ where: { id: req.params.id as string }, data: req.body });
    await audit(req.user!.id, 'UPDATE', 'Zone', zone.id);
    res.json(zone);
}

export async function deleteZone(req: AuthRequest, res: Response) {
    await prisma.zone.delete({ where: { id: req.params.id as string } });
    await audit(req.user!.id, 'DELETE', 'Zone', req.params.id as string);
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  LAB TESTS
// ═══════════════════════════════════════════

export async function getLabTests(_req: AuthRequest, res: Response) {
    const data = await prisma.labTest.findMany({ orderBy: { order: 'asc' }, include: { bundles: { include: { bundle: true } } } });
    res.json(data);
}

export async function createLabTest(req: AuthRequest, res: Response) {
    const test = await prisma.labTest.create({ data: req.body });
    await audit(req.user!.id, 'CREATE', 'LabTest', test.id);
    res.status(201).json(test);
}

export async function updateLabTest(req: AuthRequest, res: Response) {
    const test = await prisma.labTest.update({ where: { id: req.params.id as string }, data: req.body });
    await audit(req.user!.id, 'UPDATE', 'LabTest', test.id);
    res.json(test);
}

export async function deleteLabTest(req: AuthRequest, res: Response) {
    await prisma.labTest.delete({ where: { id: req.params.id as string } });
    await audit(req.user!.id, 'DELETE', 'LabTest', req.params.id as string);
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  LAB BUNDLES
// ═══════════════════════════════════════════

export async function getLabBundles(_req: AuthRequest, res: Response) {
    const data = await prisma.labBundle.findMany({ include: { tests: { include: { test: true } } } });
    res.json(data);
}

export async function createLabBundle(req: AuthRequest, res: Response) {
    const { testIds, ...bundleData } = req.body;
    const bundle = await prisma.labBundle.create({ data: bundleData });
    if (testIds?.length) {
        await prisma.labBundleTest.createMany({
            data: testIds.map((testId: string) => ({ bundleId: bundle.id, testId })),
        });
    }
    await audit(req.user!.id, 'CREATE', 'LabBundle', bundle.id);
    const full = await prisma.labBundle.findUnique({ where: { id: bundle.id }, include: { tests: { include: { test: true } } } });
    res.status(201).json(full);
}

export async function updateLabBundle(req: AuthRequest, res: Response) {
    const { testIds, ...bundleData } = req.body;
    const bundle = await prisma.labBundle.update({ where: { id: req.params.id as string }, data: bundleData });
    if (testIds) {
        await prisma.labBundleTest.deleteMany({ where: { bundleId: bundle.id } });
        await prisma.labBundleTest.createMany({
            data: testIds.map((testId: string) => ({ bundleId: bundle.id, testId })),
        });
    }
    await audit(req.user!.id, 'UPDATE', 'LabBundle', bundle.id);
    const full = await prisma.labBundle.findUnique({ where: { id: bundle.id }, include: { tests: { include: { test: true } } } });
    res.json(full);
}

export async function deleteLabBundle(req: AuthRequest, res: Response) {
    await prisma.labBundleTest.deleteMany({ where: { bundleId: req.params.id as string } });
    await prisma.labBundle.delete({ where: { id: req.params.id as string } });
    await audit(req.user!.id, 'DELETE', 'LabBundle', req.params.id as string);
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  PRESCRIPTION TEMPLATES
// ═══════════════════════════════════════════

export async function getTemplates(_req: AuthRequest, res: Response) {
    const data = await prisma.prescriptionTemplate.findMany({ include: { service: true } });
    res.json(data);
}

export async function createTemplate(req: AuthRequest, res: Response) {
    const tpl = await prisma.prescriptionTemplate.create({ data: req.body });
    res.status(201).json(tpl);
}

export async function updateTemplate(req: AuthRequest, res: Response) {
    const tpl = await prisma.prescriptionTemplate.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(tpl);
}

export async function deleteTemplate(req: AuthRequest, res: Response) {
    await prisma.prescriptionTemplate.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  FOLLOW-UP PROTOCOLS
// ═══════════════════════════════════════════

export async function getProtocols(_req: AuthRequest, res: Response) {
    const data = await prisma.followUpProtocol.findMany({ include: { service: true } });
    res.json(data);
}

export async function createProtocol(req: AuthRequest, res: Response) {
    const proto = await prisma.followUpProtocol.create({ data: req.body });
    res.status(201).json(proto);
}

export async function updateProtocol(req: AuthRequest, res: Response) {
    const proto = await prisma.followUpProtocol.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(proto);
}

export async function deleteProtocol(req: AuthRequest, res: Response) {
    await prisma.followUpProtocol.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  USE CASES (Landing Page)
// ═══════════════════════════════════════════

export async function getUseCases(_req: AuthRequest, res: Response) {
    const data = await prisma.useCase.findMany({ orderBy: { order: 'asc' } });
    res.json(data);
}

export async function getActiveUseCases(_req: AuthRequest, res: Response) {
    const data = await prisma.useCase.findMany({ where: { active: true }, orderBy: { order: 'asc' } });
    res.json(data);
}

export async function createUseCase(req: AuthRequest, res: Response) {
    const uc = await prisma.useCase.create({ data: req.body });
    res.status(201).json(uc);
}

export async function updateUseCase(req: AuthRequest, res: Response) {
    const uc = await prisma.useCase.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(uc);
}

export async function deleteUseCase(req: AuthRequest, res: Response) {
    await prisma.useCase.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════

export async function getNotificationTemplates(_req: AuthRequest, res: Response) {
    const data = await prisma.notificationTemplate.findMany();
    res.json(data);
}

export async function createNotificationTemplate(req: AuthRequest, res: Response) {
    const tpl = await prisma.notificationTemplate.create({ data: req.body });
    res.status(201).json(tpl);
}

export async function updateNotificationTemplate(req: AuthRequest, res: Response) {
    const tpl = await prisma.notificationTemplate.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(tpl);
}

export async function deleteNotificationTemplate(req: AuthRequest, res: Response) {
    await prisma.notificationTemplate.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
}

// ═══════════════════════════════════════════
//  DASHBOARD CONFIG (Public — for patient frontend)
// ═══════════════════════════════════════════

export async function getDashboardConfig(_req: AuthRequest, res: Response) {
    const [services, useCases] = await Promise.all([
        prisma.cmsService.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        prisma.useCase.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
    ]);

    // Group services by category
    const categories: Record<string, any> = {};
    for (const svc of services) {
        if (!categories[svc.category]) {
            categories[svc.category] = { title: svc.category, services: [] };
        }
        categories[svc.category].services.push(svc);
    }

    res.json({
        categories: Object.values(categories),
        useCases,
    });
}

// ═══════════════════════════════════════════
//  HELPER: Audit Log
// ═══════════════════════════════════════════

async function audit(userId: string, action: string, entity: string, entityId: string) {
    await prisma.auditLog.create({
        data: { userId, actionType: action, entityType: entity, entityId },
    });
}
