import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Comment content is required')
      .max(5000, 'Comment must be less than 5000 characters')
      .refine(content => content.trim().length > 0, {
        message: 'Comment cannot be empty'
      }),
    parentId: z.string()
      .uuid('Invalid parent comment ID')
      .optional()
      .nullable()
  })
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Comment content is required')
      .max(5000, 'Comment must be less than 5000 characters')
      .refine(content => content.trim().length > 0, {
        message: 'Comment cannot be empty'
      })
  })
});

export const commentIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid comment ID')
  })
});

export const taskCommentsSchema = z.object({
  params: z.object({
    taskId: z.string()
      .uuid('Invalid task ID')
  }),
  query: z.object({
    sortBy: z.enum(['createdAt', 'updatedAt'])
      .default('createdAt')
      .optional(),
    sortOrder: z.enum(['asc', 'desc'])
      .default('asc')
      .optional(),
    includeReplies: z.enum(['true', 'false'])
      .transform(val => val === 'true')
      .default('true')
      .optional()
  })
});

// Type exports
export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>['body'];
export type CommentIdParams = z.infer<typeof commentIdSchema>['params'];
export type TaskCommentsParams = z.infer<typeof taskCommentsSchema>['params'];
export type TaskCommentsQuery = z.infer<typeof taskCommentsSchema>['query'];