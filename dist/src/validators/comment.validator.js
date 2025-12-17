"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskCommentsSchema = exports.commentIdSchema = exports.updateCommentSchema = exports.createCommentSchema = void 0;
const zod_1 = require("zod");
exports.createCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string()
            .min(1, 'Comment content is required')
            .max(5000, 'Comment must be less than 5000 characters')
            .refine(content => content.trim().length > 0, {
            message: 'Comment cannot be empty'
        }),
        parentId: zod_1.z.string()
            .uuid('Invalid parent comment ID')
            .optional()
            .nullable()
    })
});
exports.updateCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string()
            .min(1, 'Comment content is required')
            .max(5000, 'Comment must be less than 5000 characters')
            .refine(content => content.trim().length > 0, {
            message: 'Comment cannot be empty'
        })
    })
});
exports.commentIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid comment ID')
    })
});
exports.taskCommentsSchema = zod_1.z.object({
    params: zod_1.z.object({
        taskId: zod_1.z.string()
            .uuid('Invalid task ID')
    }),
    query: zod_1.z.object({
        sortBy: zod_1.z.enum(['createdAt', 'updatedAt'])
            .default('createdAt')
            .optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc'])
            .default('asc')
            .optional(),
        includeReplies: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('true')
            .optional()
    })
});
//# sourceMappingURL=comment.validator.js.map