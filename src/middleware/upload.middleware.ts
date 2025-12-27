import multer from 'multer';
import { Request } from 'express';

// --- REMOVED: fs and path imports as we no longer write to the local disk ---

// Allowed file types (Keep your original list)
const allowedMimeTypes = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar'
};

const maxFileSize = 10 * 1024 * 1024; // 10MB

// 1. CHANGE: Use memoryStorage. 
// This stores the file in RAM temporarily as a 'buffer' so we can send it to Supabase.
const storage = multer.memoryStorage();

// File filter (Keep your original logic)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes[file.mimetype as keyof typeof allowedMimeTypes]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed.`) as any);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 5 
  }
});

// Helper functions (Keep these as they are useful for UI)
export const getFileExtension = (mimeType: string): string => {
  return allowedMimeTypes[mimeType as keyof typeof allowedMimeTypes] || 'bin';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 2. CHANGE: The deleteFile function now needs to handle Supabase deletion, 
// not local fs.unlink. For now, you can leave it empty or update it later 
// when you integrate the Supabase SDK in your controller.
export const deleteFile = async (filepath: string): Promise<void> => {
  console.log('To delete this file, use the Supabase SDK delete method in your controller.');
};