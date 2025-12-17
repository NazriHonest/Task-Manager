"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryQuerySchema = exports.categoryIdSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
exports.createCategorySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, 'Category name is required')
            .max(50, 'Category name must be less than 50 characters'),
        color: zod_1.z.string()
            .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
            .default('#6200EE')
            .optional(),
        icon: zod_1.z.string()
            .max(50, 'Icon must be less than 50 characters')
            .optional()
    })
});
exports.updateCategorySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, 'Category name is required')
            .max(50, 'Category name must be less than 50 characters')
            .optional(),
        color: zod_1.z.string()
            .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
            .optional(),
        icon: zod_1.z.string()
            .max(50, 'Icon must be less than 50 characters')
            .optional()
    })
});
exports.categoryIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid category ID')
    })
});
exports.categoryQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        withTasks: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('false')
            .optional(),
        includeTaskCount: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .default('false')
            .optional()
    })
});
//# sourceMappingURL=category.validator.js.map