import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// ================ TYPE DEFINITIONS ================

// Custom interface for multer error handling
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

// ================ FILE FILTER ================

// In upload.middleware.ts, update the fileFilter function:
const fileFilter = (
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

// ================ MULTER CONFIGURATION ================

// Memory storage (for uploading to Supabase)
const memoryStorage = multer.memoryStorage();

// Multer middleware for single file upload
export const uploadSingle = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Single file
  }
}).single('file');

// Multer middleware for multiple file uploads
export const uploadMultiple = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // Max 10 files at once
  }
}).array('files', 5);

// ================ MIDDLEWARE WRAPPERS ================

export const handleSingleUpload = (req: Request, res: any, next: any) => {
  uploadSingle(req, res, (err: any) => {
    if (err) {
      // Handle different types of errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'File size too large. Maximum size is 50MB.'
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
          message: 'Unexpected field name. Use "file" for single uploads.'
        });
      }
      
      // Handle file type errors
      if (err.message && err.message.includes('File type')) {
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

export const handleMultipleUpload = (req: Request, res: any, next: any) => {
  uploadMultiple(req, res, (err: any) => {
    if (err) {
      // Handle different types of errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: 'File size too large. Maximum size per file is 50MB.'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          status: 'error',
          message: 'Too many files. Maximum 10 files allowed.'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          status: 'error',
          message: 'Unexpected field name. Use "files" for multiple uploads.'
        });
      }
      
      // Handle file type errors
      if (err.message && err.message.includes('File type')) {
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
      
      // Generic error
      console.error('Upload error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload files',
        details: err.message
      });
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

// ================ ALTERNATIVE: SIMPLER VERSION ================

// If you prefer a simpler approach without custom wrappers:

export const uploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Max files for array upload
  }
});

// Then use in your routes:
// Single: uploadMiddleware.single('file')
// Multiple: uploadMiddleware.array('files', 10)