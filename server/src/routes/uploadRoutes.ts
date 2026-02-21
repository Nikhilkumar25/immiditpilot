import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload, uploadFile, downloadFile, deleteFile } from '../controllers/uploadController';
import { getLocalFilePath } from '../services/storageService';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Upload a file (lab, admin, nurse can upload)
router.post('/', authorize('lab', 'admin', 'nurse'), upload.single('file'), uploadFile);

// Get a signed download URL for a file (any authenticated user, ownership checked in controller)
router.get('/file/:fileId', downloadFile);

// Delete a file (owner or admin, checked in controller)
router.delete('/file/:fileId', deleteFile);

// Serve local files in development mode
router.get('/local/*', (req: AuthRequest, res: Response) => {
    const gcsPath = decodeURIComponent(req.params[0] || '');
    const localPath = getLocalFilePath(gcsPath);
    if (!localPath) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    res.sendFile(localPath);
});

export default router;
