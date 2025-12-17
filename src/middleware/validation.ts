import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request against schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors
        });
      }
      
      // Pass other errors to the global error handler
      next(error);
    }
  };

// Validation middleware for file uploads
export const validateFile = (options: {
  allowedMimeTypes?: string[];
  maxSize?: number; // in bytes
  isRequired?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      
      if (options.isRequired && !file) {
        return res.status(400).json({
          status: 'error',
          message: 'File is required'
        });
      }
      
      if (file) {
        // Check file size
        if (options.maxSize && file.size > options.maxSize) {
          return res.status(400).json({
            status: 'error',
            message: `File size exceeds maximum allowed size of ${options.maxSize / 1024 / 1024}MB`
          });
        }
        
        // Check MIME type
        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({
            status: 'error',
            message: `File type not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('File validation error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'File validation failed'
      });
    }
  };
};

// Sanitize input middleware (basic XSS protection)
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Basic HTML entity encoding
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Sanitize request body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};