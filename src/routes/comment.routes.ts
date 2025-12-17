import { Router } from 'express';
import {
  getTaskComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  getCommentReplies,
  getUserComments,
  searchComments
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createCommentSchema,
  updateCommentSchema,
  commentIdSchema,
  taskCommentsSchema
} from '../validators/comment.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Comment routes
router.get('/user', getUserComments);
router.get('/search', searchComments);
router.get('/:id', validate(commentIdSchema), getComment);
router.put('/:id', validate(commentIdSchema), validate(updateCommentSchema), updateComment);
router.delete('/:id', validate(commentIdSchema), deleteComment);
router.get('/:id/replies', validate(commentIdSchema), getCommentReplies);

// Task comments (nested under tasks)
router.get('/tasks/:taskId', validate(taskCommentsSchema), getTaskComments);
router.post('/tasks/:taskId', validate(taskCommentsSchema), validate(createCommentSchema), createComment);

export default router;