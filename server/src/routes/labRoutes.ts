import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    createLabOrder,
    confirmLabOrder,
    collectSample,
    uploadLabReport,
    reviewLabReport,
    getPatientLabOrders,
    getNurseLabTasks,
    getDoctorLabReviews,
    getLabQueue,
    confirmSampleReceipt,
} from '../controllers/labController';

const router = Router();

router.use(authenticate);

// Doctor
router.post('/order', authorize('doctor'), createLabOrder);
router.get('/orders/doctor', authorize('doctor'), getDoctorLabReviews);
router.patch('/order/:id/review', authorize('doctor'), reviewLabReport);

// Patient
router.patch('/order/:id/confirm', authorize('patient'), confirmLabOrder);
router.get('/orders/patient/:patientId', authorize('patient'), getPatientLabOrders);

// Nurse & Lab
router.get('/orders/nurse', authorize('nurse', 'lab'), getNurseLabTasks); // Shared task list? Or specific? nurse gets assigned ones. lab gets everything?
router.patch('/order/:id/collect', authorize('nurse', 'lab'), collectSample);

// Lab
router.get('/queue', authorize('lab'), getLabQueue);
router.post('/order/:id/report', authorize('admin', 'lab'), uploadLabReport);
router.patch('/order/:id/receive', authorize('lab'), confirmSampleReceipt);

// Admin
router.post('/order/:id/report/admin', authorize('admin'), uploadLabReport); // Kept for admin specific URL if needed, or just share above.

export default router;
