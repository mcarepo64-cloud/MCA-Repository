import "server-only";

import path from "node:path";
import crypto from "node:crypto";
import { STORAGE_BUCKET, supabaseStorage } from "@/lib/supabase-storage";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
  ".txt", ".zip", ".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg",
]);

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function validateStorageKey(key: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(key)) {
    throw new Error("Invalid storage key");
  }
}

export function validateUpload(file: File): string | null {
  if (file.size <= 0) return "The uploaded file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "Maximum file size is 50 MB.";

  const ext = path.extname(file.name).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "This file type is not allowed.";
  }

  if (file.name.length > 180 || /[\\/\0\r\n]/.test(file.name)) {
    return "Invalid filename.";
  }

  return null;
}

export async function saveFile(file: File) {
  const validationError = validateUpload(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const ext = path.extname(file.name).toLowerCase();
  const key = crypto.randomUUID() + ext;
  const bytes = Buffer.from(await file.arrayBuffer());

  const mimeType =
    MIME_BY_EXTENSION[ext] || "application/octet-stream";

  const { error } = await supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .upload(key, bytes, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error("Supabase upload failed: " + error.message);
  }

  return {
    key,
    sizeBytes: bytes.length,
    mimeType,
    fileName: path.basename(file.name),
  };
}

export async function deleteStoredFile(key: string) {
  validateStorageKey(key);

  const { error } = await supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .remove([key]);

  if (error) {
    throw new Error("Supabase file deletion failed: " + error.message);
  }
}

export async function readStoredFile(key: string): Promise<Buffer> {
  validateStorageKey(key);

  const { data, error } = await supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .download(key);

  if (error || !data) {
    throw new Error(
      "Supabase file download failed: " +
      (error?.message || "File not found")
    );
  }

  return Buffer.from(await data.arrayBuffer());
}