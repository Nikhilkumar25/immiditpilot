import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { submitClinicalReport, getClinicalReport } from '../controllers/clinicalController';

const router = Router();

router.use(authenticate);

router.post('/:serviceId', authorize('nurse'), submitClinicalReport);
router.get('/:serviceId', getClinicalReport);

export default router;
