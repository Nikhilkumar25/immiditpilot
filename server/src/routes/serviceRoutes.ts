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
} from '../controllers/serviceController';

const router = Router();

router.use(authenticate);

// Patient
router.post('/', authorize('patient'), createServiceRequest);
router.get('/my', authorize('patient'), getMyServiceRequests);

// Nurse
router.get('/assigned', authorize('nurse'), getAssignedCases);

// Doctor
router.get('/pending-review', authorize('doctor'), getPendingReviews);

// Admin
router.get('/all', authorize('admin'), getAllServices);
router.patch('/:id/assign', authorize('admin'), assignNurse);

// Shared
router.get('/:id', getServiceById);
router.patch('/:id/status', updateServiceStatus);

export default router;
