import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(50, 'Category name must be less than 50 characters'),
    color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
      .default('#6200EE')
      .optional(),
    icon: z.string()
      .max(50, 'Icon must be less than 50 characters')
      .optional()
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(50, 'Category name must be less than 50 characters')
      .optional(),
    color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
      .optional(),
    icon: z.string()
      .max(50, 'Icon must be less than 50 characters')
      .optional()
  })
});

export const categoryIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid category ID')
  })
});

export const categoryQuerySchema = z.object({
  query: z.object({
    withTasks: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('false')
      .optional(),
    includeTaskCount: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('false')
      .optional()
  })
});

// Type exports
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
export type CategoryIdParams = z.infer<typeof categoryIdSchema>['params'];
export type CategoryQueryParams = z.infer<typeof categoryQuerySchema>['query'];