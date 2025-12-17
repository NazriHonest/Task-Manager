"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMetricsSchema = exports.projectAnalyticsSchema = exports.userActivitySchema = exports.productivityAnalyticsSchema = exports.dashboardStatsSchema = void 0;
const zod_1 = require("zod");
exports.dashboardStatsSchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
            .optional(),
        endDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
            .optional(),
        projectId: zod_1.z.string()
            .uuid('Invalid project ID')
            .optional()
    })
});
exports.productivityAnalyticsSchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z.enum(['day', 'week', 'month', 'year'])
            .default('month')
            .optional(),
        groupBy: zod_1.z.enum(['day', 'week', 'month'])
            .default('day')
            .optional(),
        projectId: zod_1.z.string()
            .uuid('Invalid project ID')
            .optional()
    })
});
exports.userActivitySchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
            .optional(),
        endDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
            .optional(),
        limit: zod_1.z.string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
            .default('20')
            .optional()
    })
});
exports.projectAnalyticsSchema = zod_1.z.object({
    params: zod_1.z.object({
        projectId: zod_1.z.string()
            .uuid('Invalid project ID')
    }),
    query: zod_1.z.object({
        startDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
            .optional(),
        endDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
            .optional()
    })
});
exports.performanceMetricsSchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
            .optional(),
        endDate: zod_1.z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
            .optional()
    })
});
//# sourceMappingURL=dashboard.validator.js.map