import { z } from 'zod';
import { TaskStatus, Priority } from '../../generated/prisma/client';

// Task validation schemas
export const createTaskSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters'),
    description: z.string()
      .max(2000, 'Description must be less than 2000 characters')
      .optional(),
    status: z.nativeEnum(TaskStatus)
      .default(TaskStatus.PENDING)
      .optional(),
    priority: z.nativeEnum(Priority)
      .default(Priority.MEDIUM)
      .optional(),
    dueDate: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    projectId: z.string()
      .uuid('Invalid project ID')
      .optional(),
    categoryId: z.string()
      .uuid('Invalid category ID')
      .optional(),
    tagIds: z.array(z.string().uuid('Invalid tag ID'))
      .default([])
      .optional()
  })
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters')
      .optional(),
    description: z.string()
      .max(2000, 'Description must be less than 2000 characters')
      .optional(),
    status: z.nativeEnum(TaskStatus)
      .optional(),
    priority: z.nativeEnum(Priority)
      .optional(),
    dueDate: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    completedAt: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    projectId: z.string()
      .uuid('Invalid project ID')
      .optional(),
    categoryId: z.string()
      .uuid('Invalid category ID')
      .optional(),
    tagIds: z.array(z.string().uuid('Invalid tag ID'))
      .optional()
  })
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid task ID')
  })
});

export const taskQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(TaskStatus)
      .optional(),
    priority: z.nativeEnum(Priority)
      .optional(),
    projectId: z.string()
      .uuid('Invalid project ID')
      .optional(),
    categoryId: z.string()
      .uuid('Invalid category ID')
      .optional(),
    tagId: z.string()
      .uuid('Invalid tag ID')
      .optional(),
    dueDateFrom: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    dueDateTo: z.string()
      .datetime('Invalid date format')
      .optional()
      .transform(val => val ? new Date(val) : undefined),
    search: z.string()
      .optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'])
      .default('createdAt')
      .optional(),
    sortOrder: z.enum(['asc', 'desc'])
      .default('desc')
      .optional(),
    page: z.string()
      .transform(val => parseInt(val))
      .pipe(z.number().min(1))
      .default('1')
      .optional(),
    limit: z.string()
      .transform(val => parseInt(val))
      .pipe(z.number().min(1).max(100))
      .default('20')
      .optional()
  })
});

// Type exports
export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type TaskIdParams = z.infer<typeof taskIdSchema>['params'];
export type TaskQueryParams = z.infer<typeof taskQuerySchema>['query'];