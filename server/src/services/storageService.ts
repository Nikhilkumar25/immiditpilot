import crypto from "crypto";
import path from "path";

// ============ GCS INITIALIZATION ============

if (!process.env.GCS_BUCKET_NAME || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("⚠️  GCS_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS are required");
}

const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const gcsBucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

console.log(`☁️  File uploads: using Google Cloud Storage (${process.env.GCS_BUCKET_NAME})`);

// ============ UPLOAD ============

export async function uploadToGCS(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  userId: string,
): Promise<string> {
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = crypto.randomUUID();
  const filePath = `users/${userId}/${uniqueId}-${safeName}`;

  const file = gcsBucket.file(filePath);
  await file.save(fileBuffer, {
    contentType: mimeType,
    metadata: { uploadedBy: userId, originalName },
    resumable: false,
  });

  return filePath;
}

// ============ DOWNLOAD ============

export async function getSignedDownloadUrl(
  gcsPath: string,
  expiresInMinutes: number = 10,
): Promise<string> {
  const file = gcsBucket.file(gcsPath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

// ============ DELETE ============

export async function deleteFromGCS(gcsPath: string): Promise<void> {
  const file = gcsBucket.file(gcsPath);
  await file.delete({ ignoreNotFound: true });
}
