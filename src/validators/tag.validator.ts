import { z } from 'zod';

export const createTagSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Tag name is required')
      .max(30, 'Tag name must be less than 30 characters'),
    color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #757575')
      .default('#757575')
      .optional()
  })
});

export const updateTagSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Tag name is required')
      .max(30, 'Tag name must be less than 30 characters')
      .optional(),
    color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #757575')
      .optional()
  })
});

export const tagIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid tag ID')
  })
});

export const tagQuerySchema = z.object({
  query: z.object({
    withTasks: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('false')
      .optional(),
    includeTaskCount: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('false')
      .optional(),
    search: z.string()
      .optional()
  })
});

export const tagTaskSchema = z.object({
  body: z.object({
    taskIds: z.array(z.string().uuid('Invalid task ID'))
      .min(1, 'At least one task ID is required'),
    action: z.enum(['assign', 'remove'])
      .default('assign')
  })
});

// Type exports
export type CreateTagInput = z.infer<typeof createTagSchema>['body'];
export type UpdateTagInput = z.infer<typeof updateTagSchema>['body'];
export type TagIdParams = z.infer<typeof tagIdSchema>['params'];
export type TagQueryParams = z.infer<typeof tagQuerySchema>['query'];
export type TagTaskInput = z.infer<typeof tagTaskSchema>['body'];