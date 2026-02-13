import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { submitDoctorAction, getDoctorAction } from '../controllers/doctorController';

const router = Router();

router.use(authenticate);

router.post('/:serviceId/action', authorize('doctor'), submitDoctorAction);
router.get('/:serviceId/action', getDoctorAction);

export default router;
