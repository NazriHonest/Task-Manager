import { z } from 'zod';

export const uploadAttachmentSchema = z.object({
  body: z.object({
    // Handle commentId: convert empty strings/null-strings to undefined
    commentId: z.preprocess((val) => {
      if (val === '' || val === 'null' || val === 'undefined' || val === null) return undefined;
      return val;
    }, z.string().uuid('Invalid comment ID').optional().nullable()),

    // Handle isPublic: convert 'true'/'false' strings to actual booleans
    isPublic: z.preprocess(
      (val) => val === 'true' || val === true, 
      z.boolean()
    ).default(false).optional()
  })
});

export const attachmentIdSchema = z.object({
  params: z.object({
    id: z.string()
      .uuid('Invalid attachment ID')
  })
});

export const taskAttachmentsSchema = z.object({
  params: z.object({
    taskId: z.string()
      .uuid('Invalid task ID')
  })
});

export const updateAttachmentSchema = z.object({
  body: z.object({
    filename: z.string()
      .min(1, 'Filename is required')
      .max(255, 'Filename must be less than 255 characters'),
    isPublic: z.boolean()
  })
});

// Type exports
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>['body'];
export type UpdateAttachmentInput = z.infer<typeof updateAttachmentSchema>['body'];
export type AttachmentIdParams = z.infer<typeof attachmentIdSchema>['params'];
export type TaskAttachmentsParams = z.infer<typeof taskAttachmentsSchema>['params'];