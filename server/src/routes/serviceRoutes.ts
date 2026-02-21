import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    createServiceRequest,
    getMyServiceRequests,
    getAssignedCases,
    getPendingReviews,
    getServiceById,
    updateServiceStatus,
    assignNurse,
    getAllServices,
    cancelService,
    checkInstantCareAvailability,
    getFlowConfigEndpoint,
    getNurseStats,
} from '../controllers/serviceController';

const router = Router();

router.use(authenticate);

// Patient
router.post('/', authorize('patient'), createServiceRequest);
router.get('/my', authorize('patient'), getMyServiceRequests);

// Instant care availability check (patient)
router.get('/instant-care/check', authorize('patient'), checkInstantCareAvailability);

// Flow config (any authenticated user)
router.get('/flow-config/:serviceType', getFlowConfigEndpoint);

// Nurse
router.get('/assigned', authorize('nurse'), getAssignedCases);
router.get('/stats/completed', authorize('nurse'), getNurseStats);

// Doctor
router.get('/pending-review', authorize('doctor'), getPendingReviews);

// Admin
router.get('/all', authorize('admin'), getAllServices);
router.patch('/:id/assign', authorize('admin'), assignNurse);

// Shared
router.get('/:id', getServiceById);
router.patch('/:id/status', updateServiceStatus);
router.patch('/:id/cancel', cancelService);

export default router;
