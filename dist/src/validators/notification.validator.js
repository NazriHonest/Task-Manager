"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferencesSchema = exports.getNotificationsSchema = exports.notificationIdSchema = void 0;
const zod_1 = require("zod");
exports.notificationIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string()
            .uuid('Invalid notification ID')
    })
});
exports.getNotificationsSchema = zod_1.z.object({
    query: zod_1.z.object({
        limit: zod_1.z.string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
            .default('20')
            .optional(),
        page: zod_1.z.string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0, 'Page must be greater than 0')
            .default('1')
            .optional(),
        unreadOnly: zod_1.z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .optional(),
        type: zod_1.z.enum([
            'TASK_ASSIGNED',
            'TASK_UPDATED',
            'TASK_COMPLETED',
            'TASK_OVERDUE',
            'TASK_REMINDER',
            'COMMENT_ADDED',
            'COMMENT_MENTION',
            'PROJECT_INVITE',
            'PROJECT_UPDATE',
            'SYSTEM_ALERT'
        ]).optional()
    })
});
exports.updatePreferencesSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.boolean().optional(),
        push: zod_1.z.boolean().optional(),
        inApp: zod_1.z.boolean().optional(),
        taskAssigned: zod_1.z.boolean().optional(),
        taskUpdated: zod_1.z.boolean().optional(),
        taskCompleted: zod_1.z.boolean().optional(),
        taskOverdue: zod_1.z.boolean().optional(),
        commentAdded: zod_1.z.boolean().optional(),
        commentMention: zod_1.z.boolean().optional(),
        projectInvite: zod_1.z.boolean().optional(),
        projectUpdate: zod_1.z.boolean().optional(),
        systemAlert: zod_1.z.boolean().optional()
    })
});
//# sourceMappingURL=notification.validator.js.map