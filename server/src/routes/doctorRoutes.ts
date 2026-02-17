import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { submitDoctorAction, getDoctorAction, approveProcedure, requestNurseEdit } from '../controllers/doctorController';

const router = Router();

router.use(authenticate);

router.post('/:serviceId/action', authorize('doctor'), submitDoctorAction);
router.post('/:serviceId/approve', authorize('doctor'), approveProcedure);
router.post('/:serviceId/request-edit', authorize('doctor'), requestNurseEdit);
router.get('/:serviceId/action', getDoctorAction);

export default router;
