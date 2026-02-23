import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    getAvailableTests,
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
    getLabReportUrl,
} from '../controllers/labController';

const router = Router();

router.use(authenticate);

// Available tests catalog (for doctor dropdown)
router.get('/tests', getAvailableTests);

// Doctor
router.post('/order', authorize('doctor'), createLabOrder);
router.get('/orders/doctor', authorize('doctor'), getDoctorLabReviews);
router.patch('/order/:id/review', authorize('doctor'), reviewLabReport);

// Patient
router.patch('/order/:id/confirm', authorize('patient'), confirmLabOrder);
router.get('/orders/patient/:patientId', authorize('patient'), getPatientLabOrders);

// Nurse & Lab
router.get('/orders/nurse', authorize('nurse', 'lab'), getNurseLabTasks);
router.patch('/order/:id/collect', authorize('nurse', 'lab'), collectSample);

// Lab
router.get('/queue', authorize('lab'), getLabQueue);
router.post('/order/:id/report', authorize('admin', 'lab'), uploadLabReport);
router.patch('/order/:id/receive', authorize('lab'), confirmSampleReceipt);

// Report URL — any authorized participant can get a signed URL
router.get('/order/:id/report/url', authorize('patient', 'doctor', 'lab', 'admin'), getLabReportUrl);

// Admin
router.post('/order/:id/report/admin', authorize('admin'), uploadLabReport);

export default router;

