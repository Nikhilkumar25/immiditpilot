import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    getServices, createService, updateService, deleteService,
    getPricingRules, createPricingRule, updatePricingRule, deletePricingRule,
    getZones, createZone, updateZone, deleteZone,
    getLabTests, createLabTest, updateLabTest, deleteLabTest,
    getLabBundles, createLabBundle, updateLabBundle, deleteLabBundle,
    getTemplates, createTemplate, updateTemplate, deleteTemplate,
    getProtocols, createProtocol, updateProtocol, deleteProtocol,
    getUseCases, getActiveUseCases, createUseCase, updateUseCase, deleteUseCase,
    getNotificationTemplates, createNotificationTemplate, updateNotificationTemplate, deleteNotificationTemplate,
    getDashboardConfig,
} from '../controllers/cmsController';

const router = Router();

// Public endpoint — fetches active services grouped by category (no auth)
router.get('/dashboard-config', getDashboardConfig as any);

// Use Cases (Active only — available to logged in patients)
router.get('/use-cases/active', authenticate as any, getActiveUseCases as any);

// Protected admin routes
router.use(authenticate, authorize('admin'));

// Services
router.get('/services', getServices as any);
router.post('/services', createService as any);
router.patch('/services/:id', updateService as any);
router.delete('/services/:id', deleteService as any);

// Dynamic Pricing Rules
router.get('/pricing-rules', getPricingRules as any);
router.post('/pricing-rules', createPricingRule as any);
router.patch('/pricing-rules/:id', updatePricingRule as any);
router.delete('/pricing-rules/:id', deletePricingRule as any);

// Zones
router.get('/zones', getZones as any);
router.post('/zones', createZone as any);
router.patch('/zones/:id', updateZone as any);
router.delete('/zones/:id', deleteZone as any);

// Lab Tests
router.get('/lab-tests', getLabTests as any);
router.post('/lab-tests', createLabTest as any);
router.patch('/lab-tests/:id', updateLabTest as any);
router.delete('/lab-tests/:id', deleteLabTest as any);

// Lab Bundles
router.get('/lab-bundles', getLabBundles as any);
router.post('/lab-bundles', createLabBundle as any);
router.patch('/lab-bundles/:id', updateLabBundle as any);
router.delete('/lab-bundles/:id', deleteLabBundle as any);

// Prescription Templates
router.get('/templates', getTemplates as any);
router.post('/templates', createTemplate as any);
router.patch('/templates/:id', updateTemplate as any);
router.delete('/templates/:id', deleteTemplate as any);

// Follow-Up Protocols
router.get('/protocols', getProtocols as any);
router.post('/protocols', createProtocol as any);
router.patch('/protocols/:id', updateProtocol as any);
router.delete('/protocols/:id', deleteProtocol as any);

// Use Cases (Landing Page)
router.get('/use-cases', getUseCases as any);
router.post('/use-cases', createUseCase as any);
router.patch('/use-cases/:id', updateUseCase as any);
router.delete('/use-cases/:id', deleteUseCase as any);

// Notification Templates
router.get('/notifications', getNotificationTemplates as any);
router.post('/notifications', createNotificationTemplate as any);
router.patch('/notifications/:id', updateNotificationTemplate as any);
router.delete('/notifications/:id', deleteNotificationTemplate as any);

export default router;
