"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const project_validator_1 = require("../validators/project.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Project routes
router.get('/', (0, validation_1.validate)(project_validator_1.projectQuerySchema), project_controller_1.getProjects);
router.get('/:id', (0, validation_1.validate)(project_validator_1.projectIdSchema), project_controller_1.getProject);
router.post('/', (0, validation_1.validate)(project_validator_1.createProjectSchema), project_controller_1.createProject);
router.put('/:id', (0, validation_1.validate)(project_validator_1.projectIdSchema), (0, validation_1.validate)(project_validator_1.updateProjectSchema), project_controller_1.updateProject);
router.delete('/:id', (0, validation_1.validate)(project_validator_1.projectIdSchema), project_controller_1.deleteProject);
// Project tasks
router.get('/:id/tasks', (0, validation_1.validate)(project_validator_1.projectIdSchema), project_controller_1.getProjectTasks);
// Project statistics
router.get('/:id/stats', (0, validation_1.validate)(project_validator_1.projectIdSchema), project_controller_1.getProjectStats);
// Project members
router.post('/:id/members', (0, validation_1.validate)(project_validator_1.projectIdSchema), (0, validation_1.validate)(project_validator_1.projectMemberSchema), project_controller_1.addProjectMember);
router.delete('/:id/members/:memberId', (0, validation_1.validate)(project_validator_1.projectIdSchema), project_controller_1.removeProjectMember);
router.patch('/:id/members/:memberId/role', (0, validation_1.validate)(project_validator_1.projectIdSchema), project_controller_1.updateMemberRole);
exports.default = router;
//# sourceMappingURL=project.routes.js.map