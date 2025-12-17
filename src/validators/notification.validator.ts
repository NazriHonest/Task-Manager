import { z } from 'zod';

export const notificationIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid notification ID')
  })
});

export const getNotificationsSchema = z.object({
  query: z.object({
    limit: z.string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .default('20')
      .optional(),
    page: z.string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0, 'Page must be greater than 0')
      .default('1')
      .optional(),
    unreadOnly: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .optional(),
    type: z.enum([
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

export const updatePreferencesSchema = z.object({
  body: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    inApp: z.boolean().optional(),
    taskAssigned: z.boolean().optional(),
    taskUpdated: z.boolean().optional(),
    taskCompleted: z.boolean().optional(),
    taskOverdue: z.boolean().optional(),
    commentAdded: z.boolean().optional(),
    commentMention: z.boolean().optional(),
    projectInvite: z.boolean().optional(),
    projectUpdate: z.boolean().optional(),
    systemAlert: z.boolean().optional()
  })
});

// Type exports
export type NotificationIdParams = z.infer<typeof notificationIdSchema>['params'];
export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>['query'];
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>['body'];