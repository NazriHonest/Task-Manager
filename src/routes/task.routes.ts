import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  getTaskStats
} from '../controllers/task.controller';
import {
  getSubtasks,
  createSubtask,
  toggleSubtask,
  deleteSubtask
} from '../controllers/subtask.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  taskQuerySchema
} from '../validators/task.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Task routes
router.get('/', validate(taskQuerySchema), getTasks);
router.get('/stats', getTaskStats);
router.get('/:id', validate(taskIdSchema), getTask);
router.post('/', validate(createTaskSchema), createTask);
router.put('/:id', validate(taskIdSchema), validate(updateTaskSchema), updateTask);
router.delete('/:id', validate(taskIdSchema), deleteTask);
router.patch('/:id/toggle-completion', validate(taskIdSchema), toggleTaskCompletion);

// Subtask routes (nested under tasks)
router.get('/:taskId/subtasks', getSubtasks);
router.post('/:taskId/subtasks', createSubtask);
router.patch('/:taskId/subtasks/:subtaskId/toggle', toggleSubtask);
router.delete('/:taskId/subtasks/:subtaskId', deleteSubtask);

export default router;