import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
  getProjectStats
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  projectMemberSchema,
  projectQuerySchema
} from '../validators/project.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project routes
router.get('/', validate(projectQuerySchema), getProjects);
router.get('/:id', validate(projectIdSchema), getProject);
router.post('/', validate(createProjectSchema), createProject);
router.put('/:id', validate(projectIdSchema), validate(updateProjectSchema), updateProject);
router.delete('/:id', validate(projectIdSchema), deleteProject);

// Project tasks
router.get('/:id/tasks', validate(projectIdSchema), getProjectTasks);

// Project statistics
router.get('/:id/stats', validate(projectIdSchema), getProjectStats);

// Project members
router.post('/:id/members', validate(projectIdSchema), validate(projectMemberSchema), addProjectMember);
router.delete('/:id/members/:memberId', validate(projectIdSchema), removeProjectMember);
router.patch('/:id/members/:memberId/role', validate(projectIdSchema), updateMemberRole);

export default router;