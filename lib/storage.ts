import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Keep uploaded files outside the public web root. STORAGE_DIR should be an
// absolute path in production (for example D:\\MCARepositoryData\\uploads).
const configuredDir = process.env.STORAGE_DIR || "./storage";
export const storageDir = path.resolve(configuredDir);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
  ".txt", ".zip", ".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg",
]);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain", ".zip": "application/zip", ".mp4": "video/mp4",
  ".webm": "video/webm", ".mov": "video/quicktime", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
};

export function validateUpload(file: File): string | null {
  if (file.size <= 0) return "The uploaded file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "Maximum file size is 50 MB.";
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return "This file type is not allowed.";
  if (file.name.length > 180 || /[\\/\0\r\n]/.test(file.name)) return "Invalid filename.";
  return null;
}

export async function saveFile(file: File) {
  const validationError = validateUpload(file);
  if (validationError) throw new Error(validationError);
  await fs.mkdir(storageDir, { recursive: true });
  const ext = path.extname(file.name).toLowerCase();
  const key = `${crypto.randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const destination = path.join(storageDir, key);
  // wx prevents accidental overwrites even in the unlikely event of a key collision.
  await fs.writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
  return {
    key,
    sizeBytes: bytes.length,
    // Do not trust browser-provided MIME metadata; use a safe fallback if missing.
    mimeType: MIME_BY_EXTENSION[ext] || "application/octet-stream",
    fileName: path.basename(file.name),
  };
}

export async function deleteStoredFile(key: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(key)) throw new Error("Invalid storage key");
  await fs.unlink(path.join(storageDir, key));
}

export async function readStoredFile(key: string) {
  // Database values are still treated as untrusted input; only generated keys pass.
  if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(key)) throw new Error("Invalid storage key");
  return fs.readFile(path.join(storageDir, key));
}
