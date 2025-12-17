import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
  getCategoryStats,
  updateCategoryTasks
} from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  categoryQuerySchema
} from '../validators/category.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Category routes
router.get('/', validate(categoryQuerySchema), getCategories);
router.get('/stats', getCategoryStats);
router.get('/:id', validate(categoryIdSchema), getCategory);
router.post('/', validate(createCategorySchema), createCategory);
router.put('/:id', validate(categoryIdSchema), validate(updateCategorySchema), updateCategory);
router.delete('/:id', validate(categoryIdSchema), deleteCategory);
router.post('/bulk-delete', bulkDeleteCategories);
router.post('/:id/tasks', validate(categoryIdSchema), updateCategoryTasks);

export default router;