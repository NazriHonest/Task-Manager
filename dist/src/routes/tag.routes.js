"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tag_controller_1 = require("../controllers/tag.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const tag_validator_1 = require("../validators/tag.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Tag routes
router.get('/', (0, validation_1.validate)(tag_validator_1.tagQuerySchema), tag_controller_1.getTags);
router.get('/stats', tag_controller_1.getTagStats);
router.get('/popular', tag_controller_1.getPopularTags);
router.get('/search', tag_controller_1.searchTags);
router.get('/:id', (0, validation_1.validate)(tag_validator_1.tagIdSchema), tag_controller_1.getTag);
router.post('/', (0, validation_1.validate)(tag_validator_1.createTagSchema), tag_controller_1.createTag);
router.put('/:id', (0, validation_1.validate)(tag_validator_1.tagIdSchema), (0, validation_1.validate)(tag_validator_1.updateTagSchema), tag_controller_1.updateTag);
router.delete('/:id', (0, validation_1.validate)(tag_validator_1.tagIdSchema), tag_controller_1.deleteTag);
router.post('/bulk-delete', tag_controller_1.bulkDeleteTags);
router.post('/:id/tasks', (0, validation_1.validate)(tag_validator_1.tagIdSchema), (0, validation_1.validate)(tag_validator_1.tagTaskSchema), tag_controller_1.updateTagTasks);
exports.default = router;
//# sourceMappingURL=tag.routes.js.map