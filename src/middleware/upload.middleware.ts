import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// ================ HELPER FUNCTIONS ================

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ================ FILE FILTERS ================

// General file filter for attachments (supports multiple file types)
const attachmentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpg',
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip',
    'application/json', 'text/javascript', 'text/html', 'text/css', 'text/x-python',
    'application/octet-stream'
  ];

  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    '.zip', '.rar', '.tar', '.gz',
    '.json', '.js', '.html', '.css', '.py'
  ];

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} (${fileExt}) not allowed.`));
  }
};

// Avatar-specific file filter (images only)
const avatarFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtensionValid = allowedExtensions.includes(fileExt);

  if (isMimeTypeValid && isExtensionValid) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed for avatars.`));
  }
};

// ================ MULTER CONFIGURATIONS ================

const memoryStorage = multer.memoryStorage();

// 1. ATTACHMENT UPLOADS (General purpose - 50MB, multiple file types)
export const attachmentUpload = multer({
  storage: memoryStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // Max 10 files
  }
});

// Pre-configured attachment middleware exports
export const uploadSingle = attachmentUpload.single('file');
export const uploadMultiple = attachmentUpload.array('files', 10);

// 2. AVATAR UPLOADS (Images only - 5MB, strict filtering)
export const avatarUpload = multer({
  storage: memoryStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file only
  }
});

// Pre-configured avatar middleware export
export const uploadAvatar = avatarUpload.single('avatar');

// ================ SIMPLE MIDDLEWARE EXPORTS (No TypeScript Errors) ================

// Use these in your routes - they're simple and won't cause TypeScript errors
export const attachmentMiddleware = {
  single: uploadSingle,
  multiple: uploadMultiple
};

export const avatarMiddleware = {
  single: uploadAvatar
};

// ================ ERROR HANDLER MIDDLEWARE (Optional) ================

// Generic upload error handler
export const handleUploadError = (err: Error, res: Response) => {
  const multerErr = err as any;
  
  if (multerErr.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File size too large. Maximum size is 50MB for attachments, 5MB for avatars.'
    });
  }
  
  if (multerErr.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      status: 'error',
      message: 'Too many files uploaded.'
    });
  }
  
  if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      message: 'Unexpected field name. Use "file" for single uploads, "files" for multiple, or "avatar" for avatars.'
    });
  }
  
  // File type errors
  if (multerErr.message && multerErr.message.includes('not allowed')) {
    return res.status(400).json({
      status: 'error',
      message: multerErr.message
    });
  }
  
  // Unknown error
  console.error('Upload error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Upload failed',
    details: err.message
  });
};

// ================ VALIDATION HELPERS ================

// Check if file was uploaded (use in controllers)
export const validateFileUpload = (req: Request): boolean => {
  return !!(req.file || (req.files && Array.isArray(req.files) && req.files.length > 0));
};

// Get file(s) from request with type safety
export const getUploadedFiles = (req: Request): Express.Multer.File[] => {
  if (req.file) {
    return [req.file];
  }
  if (req.files && Array.isArray(req.files)) {
    return req.files as Express.Multer.File[];
  }
  return [];
};