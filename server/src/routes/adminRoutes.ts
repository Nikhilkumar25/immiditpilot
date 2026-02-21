import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getKpis, getAllUsers, getAuditLogs, getSystemConfig, updateSystemConfig, updateUserRole } from '../controllers/adminController';
import { getAllServices, assignNurse, updateServiceStatus } from '../controllers/serviceController';
import { uploadLabReport } from '../controllers/labController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/kpis', getKpis);
router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/services', getAllServices);
router.get('/audit-logs', getAuditLogs);
router.patch('/services/:id/assign-nurse', assignNurse);
router.patch('/services/:id/status', updateServiceStatus);
router.post('/lab-orders/:id/report', uploadLabReport);

router.get('/config', authenticate, authorize('admin'), getSystemConfig);
router.patch('/config', authenticate, authorize('admin'), updateSystemConfig);

export default router;
