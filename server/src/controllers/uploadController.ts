import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import multer from 'multer';
import path from 'path';
import { uploadToGCS, getSignedDownloadUrl, deleteFromGCS } from '../services/storageService';

// Use memory storage — file buffer stays in memory, gets uploaded to GCS
const memoryStorage = multer.memoryStorage();

// Init upload with security constraints
export const upload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
        ];
        const allowedExtensions = /\.(pdf|jpe?g|png|webp)$/i;

        if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.test(file.originalname)) {
            return cb(null, true);
        }
        cb(new Error('Only PDF and image files (JPEG, PNG, WebP) are allowed!'));
    },
});

/**
 * Upload a file to GCS and create a tracking record.
 * POST /api/upload
 */
export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const userId = req.user!.id;

        // Upload buffer to GCS
        const gcsPath = await uploadToGCS(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            userId,
        );

        // Create tracking record in DB
        const fileRecord = await prisma.fileUpload.create({
            data: {
                userId,
                gcsPath,
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                sizeBytes: req.file.size,
            },
        });

        // Generate a signed URL for immediate use
        const signedUrl = await getSignedDownloadUrl(gcsPath);

        res.status(201).json({
            fileId: fileRecord.id,
            url: signedUrl,
            filename: fileRecord.filename,
        });
    } catch (err: any) {
        console.error('File upload error:', err);
        res.status(500).json({ error: 'Failed to upload file', details: err.message });
    }
}

/**
 * Get a signed download URL for an existing file.
 * Enforces ownership — only the uploader or participants of associated services can access.
 * GET /api/upload/file/:fileId
 */
export async function downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
        const fileId = req.params.fileId as string;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const fileRecord = await prisma.fileUpload.findUnique({
            where: { id: fileId },
        });

        if (!fileRecord) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // Authorization: owner or admin can always access
        const isOwner = fileRecord.userId === userId;
        const isAdmin = userRole === 'admin';

        // Patients can access files linked to their own lab reports
        let isLinkedPatient = false;
        if (!isOwner && !isAdmin && userRole === 'patient') {
            const linkedReport = await prisma.labReport.findFirst({
                where: {
                    reportUrl: fileId,
                    labOrder: { patientId: userId },
                },
            });
            isLinkedPatient = !!linkedReport;
        }

        // Doctors can access files linked to lab orders they referred
        let isLinkedDoctor = false;
        if (!isOwner && !isAdmin && userRole === 'doctor') {
            const linkedReport = await prisma.labReport.findFirst({
                where: {
                    reportUrl: fileId,
                    labOrder: { doctorId: userId },
                },
            });
            isLinkedDoctor = !!linkedReport;
        }

        if (!isOwner && !isAdmin && !isLinkedPatient && !isLinkedDoctor) {
            res.status(403).json({ error: 'You do not have permission to access this file' });
            return;
        }

        const signedUrl = await getSignedDownloadUrl(fileRecord.gcsPath);

        res.json({ url: signedUrl, filename: fileRecord.filename });
    } catch (err: any) {
        console.error('File download error:', err);
        res.status(500).json({ error: 'Failed to get file URL', details: err.message });
    }
}

/**
 * Delete a file from GCS and remove the DB record.
 * Only the file owner or admin can delete.
 * DELETE /api/upload/file/:fileId
 */
export async function deleteFile(req: AuthRequest, res: Response): Promise<void> {
    try {
        const fileId = req.params.fileId as string;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const fileRecord = await prisma.fileUpload.findUnique({
            where: { id: fileId },
        });

        if (!fileRecord) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        if (fileRecord.userId !== userId && userRole !== 'admin') {
            res.status(403).json({ error: 'You do not have permission to delete this file' });
            return;
        }

        // Delete from GCS
        await deleteFromGCS(fileRecord.gcsPath);

        // Delete DB record
        await prisma.fileUpload.delete({ where: { id: fileId } });

        res.json({ message: 'File deleted successfully' });
    } catch (err: any) {
        console.error('File delete error:', err);
        res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
}
