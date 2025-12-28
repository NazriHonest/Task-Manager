import { Router } from 'express';
import {
  uploadAttachment,
  getTaskAttachments,
  getAttachment,
  downloadAttachment,
  previewAttachment,
  updateAttachment,
  deleteAttachment,
  getUserAttachments
} from '../controllers/attachment.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { upload } from '../middleware/upload.middleware';
import {
  uploadAttachmentSchema,
  attachmentIdSchema,
  taskAttachmentsSchema,
  updateAttachmentSchema
} from '../validators/attachment.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Task attachments routes
router.post(
  '/tasks/:taskId',
  upload.array('files', 5), // Max 5 files
  validate(taskAttachmentsSchema),
  validate(uploadAttachmentSchema),
  uploadAttachment
);

router.get(
  '/tasks/:taskId',
  validate(taskAttachmentsSchema),
  getTaskAttachments
);

// User attachments
router.get('/user', getUserAttachments);

// Single attachment routes
router.get('/:id', validate(attachmentIdSchema), getAttachment);
router.put('/:id', validate(attachmentIdSchema), validate(updateAttachmentSchema), updateAttachment);
router.delete('/:id', validate(attachmentIdSchema), deleteAttachment);
router.get('/:id/download', validate(attachmentIdSchema), downloadAttachment);
router.get('/:id/preview', validate(attachmentIdSchema), previewAttachment);

export default router;