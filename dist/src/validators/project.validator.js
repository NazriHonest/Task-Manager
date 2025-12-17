"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectQuerySchema = exports.projectMemberSchema = exports.projectIdSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, 'Project name is required')
            .max(100, 'Project name must be less than 100 characters'),
        description: zod_1.z.string()
            .max(1000, 'Description must be less than 1000 characters')
            .optional(),
        color: zod_1.z.string()
            .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
            .optional(),
        startDate: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        endDate: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined)
    })
});
exports.updateProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, 'Project name is required')
            .max(100, 'Project name must be less than 100 characters')
            .optional(),
        description: zod_1.z.string()
            .max(1000, 'Description must be less than 1000 characters')
            .optional(),
        color: zod_1.z.string()
            .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
            .optional(),
        startDate: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        endDate: zod_1.z.string()
            .datetime('Invalid date format')
            .optional()
            .transform(val => val ? new Date(val) : undefined),
        progress: zod_1.z.number()
            .min(0, 'Progress must be at least 0%')
            .max(100, 'Progress cannot exceed 100%')
            .optional()
    })
});
exports.projectIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid project ID')
    })
});
// Allow adding member by userId (UUID) or by email address
exports.projectMemberSchema = zod_1.z.object({
    body: zod_1.z.union([
        zod_1.z.object({
            userId: zod_1.z.string().uuid('Invalid user ID'),
            role: zod_1.z.string().min(1, 'Role is required').default('MEMBER').optional()
        }),
        zod_1.z.object({
            email: zod_1.z.string().email('Invalid email address'),
            role: zod_1.z.string().min(1, 'Role is required').default('MEMBER').optional()
        })
    ])
});
exports.projectQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string()
            .optional(),
        sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'name', 'progress'])
            .default('createdAt')
            .optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc'])
            .default('desc')
            .optional(),
        includeTasks: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('false')
            .optional(),
        includeMembers: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('false')
            .optional()
    })
});
//# sourceMappingURL=project.validator.js.map