"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAttachmentSchema = exports.taskAttachmentsSchema = exports.attachmentIdSchema = exports.uploadAttachmentSchema = void 0;
const zod_1 = require("zod");
exports.uploadAttachmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        commentId: zod_1.z.string()
            .uuid('Invalid comment ID')
            .optional()
            .nullable(),
        isPublic: zod_1.z.boolean()
            .default(false)
            .optional()
    })
});
exports.attachmentIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid attachment ID')
    })
});
exports.taskAttachmentsSchema = zod_1.z.object({
    params: zod_1.z.object({
        taskId: zod_1.z.string()
            .uuid('Invalid task ID')
    })
});
exports.updateAttachmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        filename: zod_1.z.string()
            .min(1, 'Filename is required')
            .max(255, 'Filename must be less than 255 characters'),
        isPublic: zod_1.z.boolean()
    })
});
//# sourceMappingURL=attachment.validator.js.map