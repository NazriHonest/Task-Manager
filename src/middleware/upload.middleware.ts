import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// ================ TYPE DEFINITIONS ================

interface MulterError extends Error {
  code?: string;
  field?: string;
}

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
  // Accept all file types or add specific filters
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpg',
    // Documents
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip',
    // Code files
    'application/json', 'text/javascript', 'text/html', 'text/css', 'text/x-python',
    // Allow octet-stream for unknown types
    'application/octet-stream'
  ];

  // Extract file extension for additional validation
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    '.zip', '.rar', '.tar', '.gz',
    '.json', '.js', '.html', '.css', '.py'
  ];

  // Check if MIME type is allowed OR file extension is allowed
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} (${fileExt}) not allowed. Please upload a valid file.`));
  }
};

// Avatar-specific file filter (images only)
const avatarFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Only accept image files for avatars
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  // Check file extension
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtensionValid = allowedExtensions.includes(fileExt);

  if (isMimeTypeValid && isExtensionValid) {
    cb(null, true);
  } else {
    const errorMsg = isMimeTypeValid 
      ? `File extension ${fileExt} not allowed for avatars.`
      : `File type ${file.mimetype} not allowed for avatars. Only images (JPG, PNG, GIF, WebP) are allowed.`;
    
    cb(new Error(errorMsg));
  }
};

// ================ MULTER CONFIGURATIONS ================

// Memory storage (for uploading to Supabase)
const memoryStorage = multer.memoryStorage();

// ================ ATTACHMENT UPLOAD CONFIGS ================

// For task attachments (general purpose)
export const attachmentUpload = multer({
  storage: memoryStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 10 // Max 10 files for array uploads
  }
});

// Single attachment upload middleware
export const uploadSingle = attachmentUpload.single('file');

// Multiple attachments upload middleware
export const uploadMultiple = attachmentUpload.array('files', 10);

// ================ AVATAR UPLOAD CONFIGS ================

// For user avatars (strict image-only, smaller size)
export const avatarUpload = multer({
  storage: memoryStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars (more strict)
    files: 1 // Only one avatar at a time
  }
});

// Single avatar upload middleware
export const uploadAvatar = avatarUpload.single('avatar'); // Field name must be 'avatar'

// ================ MIDDLEWARE WRAPPERS ================

// General single upload wrapper (for attachments)
export const handleSingleUpload = (req: Request, res: any, next: any) => {
  uploadSingle(req, res, (err: any) => {
    if (err) {
      return _handleUploadError(err, res, 'file');
    }
    
    // No file uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Please select a file.'
      });
    }
    
    next();
  });
};

// General multiple upload wrapper (for attachments)
export const handleMultipleUpload = (req: Request, res: any, next: any) => {
  uploadMultiple(req, res, (err: any) => {
    if (err) {
      return _handleUploadError(err, res, 'files');
    }
    
    // No files uploaded
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded. Please select at least one file.'
      });
    }
    
    next();
  });
};

// Avatar upload wrapper (specific for avatars)
export const handleAvatarUpload = (req: Request, res: any, next: any) => {
  uploadAvatar(req, res, (err: any) => {
    if (err) {
      return _handleAvatarUploadError(err, res);
    }
    
    // No file uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No avatar image uploaded. Please select an image.'
      });
    }
    
    // Additional validation for avatar dimensions (optional)
    // You could add image dimension checks here if needed
    
    next();
  });
};

// ================ ERROR HANDLING HELPERS ================

const _handleUploadError = (err: any, res: any, fieldName: string) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: `File size too large. Maximum size is ${err.field === 'avatar' ? '5MB' : '50MB'}.`
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      status: 'error',
      message: 'Too many files. Please upload one file at a time.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      message: `Unexpected field name. Use "${fieldName}" for uploads.`
    });
  }
  
  // Handle file type errors
  if (err.message && (err.message.includes('File type') || err.message.includes('not allowed'))) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  // Generic error
  console.error('Upload error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Failed to upload file',
    details: err.message
  });
};

const _handleAvatarUploadError = (err: any, res: any) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'Avatar image too large. Maximum size is 5MB.'
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      status: 'error',
      message: 'Please upload only one avatar image at a time.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      message: 'Unexpected field name. Use "avatar" for avatar uploads.'
    });
  }
  
  // Handle avatar-specific file type errors
  if (err.message && err.message.includes('avatar')) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  // Generic error
  console.error('Avatar upload error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Failed to upload avatar',
    details: err.message
  });
};

// ================ ALTERNATIVE: SIMPLER EXPORTS ================

// For direct use in routes (if you prefer this approach)
export const uploadMiddleware = {
  // For attachments
  single: attachmentUpload.single('file'),
  multiple: attachmentUpload.array('files', 10),
  
  // For avatars
  avatar: avatarUpload.single('avatar')
};