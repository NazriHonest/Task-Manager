"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("../controllers/task.controller");
const subtask_controller_1 = require("../controllers/subtask.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const task_validator_1 = require("../validators/task.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Task routes
router.get('/', (0, validation_1.validate)(task_validator_1.taskQuerySchema), task_controller_1.getTasks);
router.get('/stats', task_controller_1.getTaskStats);
router.get('/:id', (0, validation_1.validate)(task_validator_1.taskIdSchema), task_controller_1.getTask);
router.post('/', (0, validation_1.validate)(task_validator_1.createTaskSchema), task_controller_1.createTask);
router.put('/:id', (0, validation_1.validate)(task_validator_1.taskIdSchema), (0, validation_1.validate)(task_validator_1.updateTaskSchema), task_controller_1.updateTask);
router.delete('/:id', (0, validation_1.validate)(task_validator_1.taskIdSchema), task_controller_1.deleteTask);
router.patch('/:id/toggle-completion', (0, validation_1.validate)(task_validator_1.taskIdSchema), task_controller_1.toggleTaskCompletion);
// Subtask routes (nested under tasks)
router.get('/:taskId/subtasks', subtask_controller_1.getSubtasks);
router.post('/:taskId/subtasks', subtask_controller_1.createSubtask);
router.patch('/:taskId/subtasks/:subtaskId/toggle', subtask_controller_1.toggleSubtask);
router.delete('/:taskId/subtasks/:subtaskId', subtask_controller_1.deleteSubtask);
exports.default = router;
//# sourceMappingURL=task.routes.js.map