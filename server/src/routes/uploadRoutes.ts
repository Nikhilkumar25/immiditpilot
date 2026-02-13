import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload, uploadFile } from '../controllers/uploadController';

const router = Router();

router.use(authenticate);

// Allow Lab and Admin to upload files
router.post('/', authorize('lab', 'admin'), upload.single('file'), uploadFile);

export default router;
