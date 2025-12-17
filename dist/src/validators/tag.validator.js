"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagTaskSchema = exports.tagQuerySchema = exports.tagIdSchema = exports.updateTagSchema = exports.createTagSchema = void 0;
const zod_1 = require("zod");
exports.createTagSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, 'Tag name is required')
            .max(30, 'Tag name must be less than 30 characters'),
        color: zod_1.z.string()
            .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #757575')
            .default('#757575')
            .optional()
    })
});
exports.updateTagSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, 'Tag name is required')
            .max(30, 'Tag name must be less than 30 characters')
            .optional(),
        color: zod_1.z.string()
            .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #757575')
            .optional()
    })
});
exports.tagIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid tag ID')
    })
});
exports.tagQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        withTasks: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('false')
            .optional(),
        includeTaskCount: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('false')
            .optional(),
        search: zod_1.z.string()
            .optional()
    })
});
exports.tagTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        taskIds: zod_1.z.array(zod_1.z.string().uuid('Invalid task ID'))
            .min(1, 'At least one task ID is required'),
        action: zod_1.z.enum(['assign', 'remove'])
            .default('assign')
    })
});
//# sourceMappingURL=tag.validator.js.map