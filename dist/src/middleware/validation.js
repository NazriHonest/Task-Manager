"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validateFile = exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => async (req, res, next) => {
    try {
        // Validate request against schema
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
            headers: req.headers
        });
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
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
exports.validate = validate;
// Validation middleware for file uploads
const validateFile = (options) => {
    return (req, res, next) => {
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
        }
        catch (error) {
            console.error('File validation error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'File validation failed'
            });
        }
    };
};
exports.validateFile = validateFile;
// Sanitize input middleware (basic XSS protection)
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
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
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitize(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };
    // Sanitize request body, query, and params
    if (req.body)
        req.body = sanitize(req.body);
    if (req.query)
        req.query = sanitize(req.query);
    if (req.params)
        req.params = sanitize(req.params);
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=validation.js.map