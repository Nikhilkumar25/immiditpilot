import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload, uploadFile, downloadFile, deleteFile } from '../controllers/uploadController';

const router = Router();

router.use(authenticate);

// Upload a file (lab, admin, nurse can upload)
router.post('/', authorize('lab', 'admin', 'nurse'), upload.single('file'), uploadFile);

// Get a signed download URL for a file (any authenticated user, ownership checked in controller)
router.get('/file/:fileId', downloadFile);

// Delete a file (owner or admin, checked in controller)
router.delete('/file/:fileId', deleteFile);

export default router;

