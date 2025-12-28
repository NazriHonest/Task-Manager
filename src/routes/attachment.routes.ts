import { Router } from 'express';
import {
  uploadSingleAttachment,
  uploadMultipleAttachments,
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
import { uploadMiddleware } from '../middleware/upload.middleware'; // Changed from 'upload'
import {
  uploadAttachmentSchema,
  attachmentIdSchema,
  taskAttachmentsSchema,
  updateAttachmentSchema
} from '../validators/attachment.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Single file upload route (for Flutter app)
router.post(
  '/tasks/:taskId/single',
  uploadMiddleware.single('file'), // Accepts single file with field name 'file'
  validate(taskAttachmentsSchema),
  uploadSingleAttachment
);

// Multiple files upload route
router.post(
  '/tasks/:taskId/multiple',
  uploadMiddleware.array('files', 5), // Accepts up to 5 files with field name 'files'
  validate(taskAttachmentsSchema),
  uploadMultipleAttachments
);

// Get all attachments for a task
router.get(
  '/tasks/:taskId',
  validate(taskAttachmentsSchema),
  getTaskAttachments
);

// Get user's attachments
router.get('/user', getUserAttachments);

// Single attachment operations
router.get('/:id', validate(attachmentIdSchema), getAttachment);
router.put('/:id', validate(attachmentIdSchema), validate(updateAttachmentSchema), updateAttachment);
router.delete('/:id', validate(attachmentIdSchema), deleteAttachment);
router.get('/:id/download', validate(attachmentIdSchema), downloadAttachment);
router.get('/:id/preview', validate(attachmentIdSchema), previewAttachment);

export default router;