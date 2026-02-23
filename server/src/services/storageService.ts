import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ============ MODE DETECTION ============
const USE_GCS = !!(process.env.GCS_BUCKET_NAME && process.env.GOOGLE_APPLICATION_CREDENTIALS);
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure local uploads directory exists in dev mode
if (!USE_GCS) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    console.log(`📁 File uploads: using local storage (${LOCAL_UPLOAD_DIR})`);
} else {
    console.log(`☁️  File uploads: using Google Cloud Storage (${process.env.GCS_BUCKET_NAME})`);
}

// ============ GCS (Production) ============
let gcsBucket: any = null;

function getGCSBucket() {
    if (gcsBucket) return gcsBucket;
    if (!USE_GCS) return null;

    try {
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage();
        gcsBucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
        console.log(`✅ GCS initialized successfully with bucket: ${process.env.GCS_BUCKET_NAME}`);
        return gcsBucket;
    } catch (err: any) {
        console.error('❌ Failed to initialize GCS. Falling back to local/disabled state.', {
            error: err.message,
            bucket: process.env.GCS_BUCKET_NAME,
            hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
        return null;
    }
}

// ============ UPLOAD ============

export async function uploadToGCS(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
): Promise<string> {
    const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueId = crypto.randomUUID();
    const filePath = `users/${userId}/${uniqueId}-${safeName}`;

    if (USE_GCS) {
        const bucket = getGCSBucket();
        if (!bucket) throw new Error('GCS not configured');

        const file = bucket.file(filePath);
        await file.save(fileBuffer, {
            contentType: mimeType,
            metadata: { uploadedBy: userId, originalName },
            resumable: false,
        });
    } else {
        // Local file storage for development
        const localDir = path.join(LOCAL_UPLOAD_DIR, 'users', userId);
        fs.mkdirSync(localDir, { recursive: true });
        const localPath = path.join(localDir, `${uniqueId}-${safeName}`);
        fs.writeFileSync(localPath, fileBuffer);
    }

    return filePath;
}

// ============ DOWNLOAD ============

export async function getSignedDownloadUrl(
    gcsPath: string,
    expiresInMinutes: number = 15,
): Promise<string> {
    if (USE_GCS) {
        const bucket = getGCSBucket();
        if (!bucket) throw new Error('GCS not configured');

        const file = bucket.file(gcsPath);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });
        return url;
    } else {
        // Return a direct URL to the server's static /uploads route
        const port = process.env.PORT || 3001;
        return `http://localhost:${port}/uploads/${gcsPath}`;
    }
}

// ============ DELETE ============

export async function deleteFromGCS(gcsPath: string): Promise<void> {
    if (USE_GCS) {
        const bucket = getGCSBucket();
        if (!bucket) throw new Error('GCS not configured');

        const file = bucket.file(gcsPath);
        await file.delete({ ignoreNotFound: true });
    } else {
        // Delete local file
        const localPath = path.join(LOCAL_UPLOAD_DIR, gcsPath);
        try { fs.unlinkSync(localPath); } catch { /* ignore */ }
    }
}

// ============ LOCAL FILE SERVING (dev only) ============

export function getLocalFilePath(gcsPath: string): string | null {
    if (USE_GCS) return null;
    const localPath = path.join(LOCAL_UPLOAD_DIR, gcsPath);
    return fs.existsSync(localPath) ? localPath : null;
}
