"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAttachments = exports.deleteAttachment = exports.updateAttachment = exports.previewAttachment = exports.downloadAttachment = exports.getAttachment = exports.getTaskAttachments = exports.uploadAttachment = void 0;
const prisma_1 = require("../../lib/prisma");
const upload_middleware_1 = require("../middleware/upload.middleware");
//const prisma = new PrismaClient();
// Upload attachment to task
const uploadAttachment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { taskId } = req.params;
        const body = req.body;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No files uploaded'
            });
        }
        // Check if task exists and user has access
        const task = await prisma_1.prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [
                    { userId },
                    {
                        project: {
                            members: {
                                some: { userId }
                            }
                        }
                    }
                ]
            }
        });
        if (!task) {
            // Delete uploaded files if task doesn't exist
            await Promise.all(files.map(file => (0, upload_middleware_1.deleteFile)(file.path)));
            return res.status(404).json({
                status: 'error',
                message: 'Task not found or you do not have access'
            });
        }
        // Check if comment exists (if provided)
        if (body.commentId) {
            const comment = await prisma_1.prisma.comment.findFirst({
                where: {
                    id: body.commentId,
                    taskId
                }
            });
            if (!comment) {
                // Delete uploaded files if comment doesn't exist
                await Promise.all(files.map(file => (0, upload_middleware_1.deleteFile)(file.path)));
                return res.status(404).json({
                    status: 'error',
                    message: 'Comment not found'
                });
            }
        }
        // Create attachments in database
        const attachments = await Promise.all(files.map(async (file) => {
            return await prisma_1.prisma.attachment.create({
                data: {
                    filename: file.originalname,
                    filepath: file.path,
                    filetype: file.mimetype,
                    filesize: file.size,
                    isPublic: body.isPublic || false,
                    taskId,
                    userId,
                    commentId: body.commentId
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true
                        }
                    }
                }
            });
        }));
        // Format response
        const formattedAttachments = attachments.map(attachment => ({
            ...attachment,
            formattedSize: (0, upload_middleware_1.formatFileSize)(attachment.filesize),
            downloadUrl: `/api/attachments/${attachment.id}/download`
        }));
        return res.status(201).json({
            status: 'success',
            message: `Successfully uploaded ${attachments.length} file(s)`,
            data: { attachments: formattedAttachments }
        });
    }
    catch (error) {
        console.error('Upload attachment error:', error);
        // Clean up any uploaded files on error
        if (req.files) {
            await Promise.all(req.files.map(file => (0, upload_middleware_1.deleteFile)(file.path).catch(() => { })));
        }
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.uploadAttachment = uploadAttachment;
// Get all attachments for a task
const getTaskAttachments = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { taskId } = req.params;
        // Check if task exists and user has access
        const task = await prisma_1.prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [
                    { userId },
                    {
                        project: {
                            members: {
                                some: { userId }
                            }
                        }
                    }
                ]
            }
        });
        if (!task) {
            return res.status(404).json({
                status: 'error',
                message: 'Task not found or you do not have access'
            });
        }
        const attachments = await prisma_1.prisma.attachment.findMany({
            where: {
                taskId,
                OR: [
                    { isPublic: true },
                    { userId }, // User's own files
                    {
                        task: {
                            OR: [
                                { userId }, // Task owner
                                {
                                    project: {
                                        members: {
                                            some: { userId }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                comment: {
                    select: {
                        id: true,
                        content: true,
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Format response
        const formattedAttachments = attachments.map(attachment => ({
            ...attachment,
            formattedSize: (0, upload_middleware_1.formatFileSize)(attachment.filesize),
            downloadUrl: `/api/attachments/${attachment.id}/download`,
            previewUrl: attachment.filetype.startsWith('image/')
                ? `/api/attachments/${attachment.id}/preview`
                : null
        }));
        return res.status(200).json({
            status: 'success',
            data: {
                attachments: formattedAttachments,
                total: attachments.length,
                totalSize: (0, upload_middleware_1.formatFileSize)(attachments.reduce((sum, att) => sum + att.filesize, 0))
            }
        });
    }
    catch (error) {
        console.error('Get task attachments error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getTaskAttachments = getTaskAttachments;
// Get single attachment
const getAttachment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const attachment = await prisma_1.prisma.attachment.findFirst({
            where: {
                id,
                OR: [
                    { isPublic: true },
                    { userId }, // User's own file
                    {
                        task: {
                            OR: [
                                { userId }, // Task owner
                                {
                                    project: {
                                        members: {
                                            some: { userId }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                },
                task: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                comment: {
                    select: {
                        id: true,
                        content: true
                    }
                }
            }
        });
        if (!attachment) {
            return res.status(404).json({
                status: 'error',
                message: 'Attachment not found or you do not have access'
            });
        }
        const formattedAttachment = {
            ...attachment,
            formattedSize: (0, upload_middleware_1.formatFileSize)(attachment.filesize),
            downloadUrl: `/api/attachments/${attachment.id}/download`,
            previewUrl: attachment.filetype.startsWith('image/')
                ? `/api/attachments/${attachment.id}/preview`
                : null
        };
        return res.status(200).json({
            status: 'success',
            data: { attachment: formattedAttachment }
        });
    }
    catch (error) {
        console.error('Get attachment error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getAttachment = getAttachment;
// Download attachment
const downloadAttachment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const attachment = await prisma_1.prisma.attachment.findFirst({
            where: {
                id,
                OR: [
                    { isPublic: true },
                    { userId }, // User's own file
                    {
                        task: {
                            OR: [
                                { userId }, // Task owner
                                {
                                    project: {
                                        members: {
                                            some: { userId }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        });
        if (!attachment) {
            return res.status(404).json({
                status: 'error',
                message: 'Attachment not found or you do not have access'
            });
        }
        // Check if file exists
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        if (!fs.existsSync(attachment.filepath)) {
            return res.status(404).json({
                status: 'error',
                message: 'File not found on server'
            });
        }
        // Set headers for download
        res.setHeader('Content-Type', attachment.filetype);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
        res.setHeader('Content-Length', attachment.filesize.toString());
        // Stream the file
        const fileStream = fs.createReadStream(attachment.filepath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Download attachment error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.downloadAttachment = downloadAttachment;
// Preview image attachment
const previewAttachment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const attachment = await prisma_1.prisma.attachment.findFirst({
            where: {
                id,
                filetype: {
                    startsWith: 'image/'
                },
                OR: [
                    { isPublic: true },
                    { userId },
                    {
                        task: {
                            OR: [
                                { userId },
                                {
                                    project: {
                                        members: {
                                            some: { userId }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        });
        if (!attachment) {
            return res.status(404).json({
                status: 'error',
                message: 'Image not found or you do not have access'
            });
        }
        // Check if file exists
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        if (!fs.existsSync(attachment.filepath)) {
            return res.status(404).json({
                status: 'error',
                message: 'File not found on server'
            });
        }
        // Set headers for image preview
        res.setHeader('Content-Type', attachment.filetype);
        res.setHeader('Content-Length', attachment.filesize.toString());
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        // Stream the image
        const fileStream = fs.createReadStream(attachment.filepath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Preview attachment error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.previewAttachment = previewAttachment;
// Update attachment metadata
const updateAttachment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const data = req.body;
        // Check if attachment exists and belongs to user
        const attachment = await prisma_1.prisma.attachment.findFirst({
            where: {
                id,
                userId // Only owner can update
            }
        });
        if (!attachment) {
            return res.status(404).json({
                status: 'error',
                message: 'Attachment not found or you do not have permission to update'
            });
        }
        const updatedAttachment = await prisma_1.prisma.attachment.update({
            where: { id },
            data: {
                filename: data.filename,
                isPublic: data.isPublic,
                updatedAt: new Date()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        });
        const formattedAttachment = {
            ...updatedAttachment,
            formattedSize: (0, upload_middleware_1.formatFileSize)(updatedAttachment.filesize),
            downloadUrl: `/api/attachments/${updatedAttachment.id}/download`
        };
        return res.status(200).json({
            status: 'success',
            message: 'Attachment updated successfully',
            data: { attachment: formattedAttachment }
        });
    }
    catch (error) {
        console.error('Update attachment error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateAttachment = updateAttachment;
// Delete attachment
const deleteAttachment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Check if attachment exists
        const attachment = await prisma_1.prisma.attachment.findFirst({
            where: { id },
            include: {
                task: {
                    select: {
                        userId: true,
                        project: {
                            select: {
                                userId: true,
                                members: {
                                    where: { userId },
                                    select: { role: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!attachment) {
            return res.status(404).json({
                status: 'error',
                message: 'Attachment not found'
            });
        }
        // Check permissions:
        // 1. Attachment owner can delete
        // 2. Task owner can delete
        // 3. Project owner can delete
        // 4. Project admin can delete
        const isAttachmentOwner = attachment.userId === userId;
        const isTaskOwner = attachment.task.userId === userId;
        const isProjectOwner = attachment.task.project?.userId === userId;
        const isProjectAdmin = attachment.task.project?.members.some(member => member.role === 'ADMIN');
        if (!isAttachmentOwner && !isTaskOwner && !isProjectOwner && !isProjectAdmin) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to delete this attachment'
            });
        }
        // Delete file from filesystem
        try {
            await (0, upload_middleware_1.deleteFile)(attachment.filepath);
        }
        catch (error) {
            console.warn('Could not delete physical file, but continuing with DB deletion:', error);
        }
        // Delete from database
        await prisma_1.prisma.attachment.delete({
            where: { id }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Attachment deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete attachment error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.deleteAttachment = deleteAttachment;
// Get user's attachments
const getUserAttachments = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = '20', page = '1' } = req.query;
        const limitNum = parseInt(limit) || 20;
        const pageNum = parseInt(page) || 1;
        const skip = (pageNum - 1) * limitNum;
        const [attachments, total] = await Promise.all([
            prisma_1.prisma.attachment.findMany({
                where: { userId },
                include: {
                    task: {
                        select: {
                            id: true,
                            title: true
                        }
                    },
                    comment: {
                        select: {
                            id: true,
                            content: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma_1.prisma.attachment.count({
                where: { userId }
            })
        ]);
        // Format response
        const formattedAttachments = attachments.map(attachment => ({
            ...attachment,
            formattedSize: (0, upload_middleware_1.formatFileSize)(attachment.filesize),
            downloadUrl: `/api/attachments/${attachment.id}/download`
        }));
        return res.status(200).json({
            status: 'success',
            data: {
                attachments: formattedAttachments,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                    hasNext: pageNum * limitNum < total,
                    hasPrev: pageNum > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Get user attachments error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getUserAttachments = getUserAttachments;
//# sourceMappingURL=attachment.controller.js.map