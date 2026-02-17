import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    handleGeneratePrescription,
    handleGetPrescription,
    handleGetFollowUps,
} from '../controllers/prescriptionController';

const router = Router();

// Generate prescription (doctor only)
router.post('/services/:serviceId/prescription/generate', authenticate, handleGeneratePrescription);

// Get prescription for a service
router.get('/services/:serviceId/prescription', authenticate, handleGetPrescription);

// Get follow-up tasks for a patient
router.get('/patients/:patientId/follow-ups', authenticate, handleGetFollowUps);

export default router;
