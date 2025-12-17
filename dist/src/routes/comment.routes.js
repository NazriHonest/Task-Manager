"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comment_controller_1 = require("../controllers/comment.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const comment_validator_1 = require("../validators/comment.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Comment routes
router.get('/user', comment_controller_1.getUserComments);
router.get('/search', comment_controller_1.searchComments);
router.get('/:id', (0, validation_1.validate)(comment_validator_1.commentIdSchema), comment_controller_1.getComment);
router.put('/:id', (0, validation_1.validate)(comment_validator_1.commentIdSchema), (0, validation_1.validate)(comment_validator_1.updateCommentSchema), comment_controller_1.updateComment);
router.delete('/:id', (0, validation_1.validate)(comment_validator_1.commentIdSchema), comment_controller_1.deleteComment);
router.get('/:id/replies', (0, validation_1.validate)(comment_validator_1.commentIdSchema), comment_controller_1.getCommentReplies);
// Task comments (nested under tasks)
router.get('/tasks/:taskId', (0, validation_1.validate)(comment_validator_1.taskCommentsSchema), comment_controller_1.getTaskComments);
router.post('/tasks/:taskId', (0, validation_1.validate)(comment_validator_1.taskCommentsSchema), (0, validation_1.validate)(comment_validator_1.createCommentSchema), comment_controller_1.createComment);
exports.default = router;
//# sourceMappingURL=comment.routes.js.map