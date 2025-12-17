"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQuerySchema = exports.taskIdSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("../../generated/prisma/client");
// Task validation schemas
exports.createTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string()
            .min(1, 'Title is required')
            .max(255, 'Title must be less than 255 characters'),
        description: zod_1.z.string()
            .max(2000, 'Description must be less than 2000 characters')
            .optional(),
        status: zod_1.z.nativeEnum(client_1.TaskStatus)
            .default(client_1.TaskStatus.PENDING)
            .optional(),
        priority: zod_1.z.nativeEnum(client_1.Priority)
            .default(client_1.Priority.MEDIUM)
            .optional(),
        dueDate: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        projectId: zod_1.z.string()
            .uuid('Invalid project ID')
            .optional(),
        categoryId: zod_1.z.string()
            .uuid('Invalid category ID')
            .optional(),
        tagIds: zod_1.z.array(zod_1.z.string().uuid('Invalid tag ID'))
            .default([])
            .optional()
    })
});
exports.updateTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string()
            .min(1, 'Title is required')
            .max(255, 'Title must be less than 255 characters')
            .optional(),
        description: zod_1.z.string()
            .max(2000, 'Description must be less than 2000 characters')
            .optional(),
        status: zod_1.z.nativeEnum(client_1.TaskStatus)
            .optional(),
        priority: zod_1.z.nativeEnum(client_1.Priority)
            .optional(),
        dueDate: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        completedAt: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        projectId: zod_1.z.string()
            .uuid('Invalid project ID')
            .optional(),
        categoryId: zod_1.z.string()
            .uuid('Invalid category ID')
            .optional(),
        tagIds: zod_1.z.array(zod_1.z.string().uuid('Invalid tag ID'))
            .optional()
    })
});
exports.taskIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid task ID')
    })
});
exports.taskQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.nativeEnum(client_1.TaskStatus)
            .optional(),
        priority: zod_1.z.nativeEnum(client_1.Priority)
            .optional(),
        projectId: zod_1.z.string()
            .uuid('Invalid project ID')
            .optional(),
        categoryId: zod_1.z.string()
            .uuid('Invalid category ID')
            .optional(),
        tagId: zod_1.z.string()
            .uuid('Invalid tag ID')
            .optional(),
        dueDateFrom: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        dueDateTo: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        search: zod_1.z.string()
            .optional(),
        sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'])
            .default('createdAt')
            .optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc'])
            .default('desc')
            .optional(),
        page: zod_1.z.string()
            .transform(val => parseInt(val))
            .pipe(zod_1.z.number().min(1))
            .default('1')
            .optional(),
        limit: zod_1.z.string()
            .transform(val => parseInt(val))
            .pipe(zod_1.z.number().min(1).max(100))
            .default('20')
            .optional()
    })
});
//# sourceMappingURL=task.validator.js.map