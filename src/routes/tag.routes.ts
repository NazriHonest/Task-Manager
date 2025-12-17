import { Router } from 'express';
import {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  bulkDeleteTags,
  getTagStats,
  updateTagTasks,
  getPopularTags,
  searchTags
} from '../controllers/tag.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createTagSchema,
  updateTagSchema,
  tagIdSchema,
  tagQuerySchema,
  tagTaskSchema
} from '../validators/tag.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Tag routes
router.get('/', validate(tagQuerySchema), getTags);
router.get('/stats', getTagStats);
router.get('/popular', getPopularTags);
router.get('/search', searchTags);
router.get('/:id', validate(tagIdSchema), getTag);
router.post('/', validate(createTagSchema), createTag);
router.put('/:id', validate(tagIdSchema), validate(updateTagSchema), updateTag);
router.delete('/:id', validate(tagIdSchema), deleteTag);
router.post('/bulk-delete', bulkDeleteTags);
router.post('/:id/tasks', validate(tagIdSchema), validate(tagTaskSchema), updateTagTasks);

export default router;