import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Project name is required')
      .max(100, 'Project name must be less than 100 characters'),
    description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional(),
    color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
      .optional(),
    startDate: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    endDate: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined)
  })
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Project name is required')
      .max(100, 'Project name must be less than 100 characters')
      .optional(),
    description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional(),
    color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex format like #6200EE')
      .optional(),
    startDate: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    endDate: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    progress: z.number()
      .min(0, 'Progress must be at least 0%')
      .max(100, 'Progress cannot exceed 100%')
      .optional()
  })
});

export const projectIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid project ID')
  })
});

// Allow adding member by userId (UUID) or by email address
export const projectMemberSchema = z.object({
  body: z.union([
    z.object({
      userId: z.string().uuid('Invalid user ID'),
      role: z.string().min(1, 'Role is required').default('MEMBER').optional()
    }),
    z.object({
      email: z.string().email('Invalid email address'),
      role: z.string().min(1, 'Role is required').default('MEMBER').optional()
    })
  ])
});

export const projectQuerySchema = z.object({
  query: z.object({
    search: z.string()
      .optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'progress'])
      .default('createdAt')
      .optional(),
    sortOrder: z.enum(['asc', 'desc'])
      .default('desc')
      .optional(),
    includeTasks: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('false')
      .optional(),
    includeMembers: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('false')
      .optional()
  })
});

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
export type ProjectIdParams = z.infer<typeof projectIdSchema>['params'];
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>['body'];
export type ProjectQueryParams = z.infer<typeof projectQuerySchema>['query'];