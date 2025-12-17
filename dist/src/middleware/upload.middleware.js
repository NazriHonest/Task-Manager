"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.formatFileSize = exports.getFileExtension = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Allowed file types
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
// File size limit: 10MB
const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Safely access user property with type checking
        const userId = req.user?.userId || 'general';
        const userDir = path_1.default.join(uploadDir, userId);
        if (!fs_1.default.existsSync(userDir)) {
            fs_1.default.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
// File filter
const fileFilter = (req, file, cb) => {
    // Check file type
    if (allowedMimeTypes[file.mimetype]) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${Object.keys(allowedMimeTypes).join(', ')}`));
    }
};
// Create multer instance
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: maxFileSize,
        files: 5 // Max 5 files per request
    }
});
// Helper to get file extension from mime type
const getFileExtension = (mimeType) => {
    return allowedMimeTypes[mimeType] || 'bin';
};
exports.getFileExtension = getFileExtension;
// Helper to format file size
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
// Delete file utility
const deleteFile = (filepath) => {
    return new Promise((resolve, reject) => {
        fs_1.default.unlink(filepath, (err) => {
            if (err) {
                // If file doesn't exist, it's already deleted
                if (err.code === 'ENOENT') {
                    resolve();
                }
                else {
                    reject(err);
                }
            }
            else {
                resolve();
            }
        });
    });
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=upload.middleware.js.map