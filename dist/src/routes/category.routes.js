"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const category_validator_1 = require("../validators/category.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Category routes
router.get('/', (0, validation_1.validate)(category_validator_1.categoryQuerySchema), category_controller_1.getCategories);
router.get('/stats', category_controller_1.getCategoryStats);
router.get('/:id', (0, validation_1.validate)(category_validator_1.categoryIdSchema), category_controller_1.getCategory);
router.post('/', (0, validation_1.validate)(category_validator_1.createCategorySchema), category_controller_1.createCategory);
router.put('/:id', (0, validation_1.validate)(category_validator_1.categoryIdSchema), (0, validation_1.validate)(category_validator_1.updateCategorySchema), category_controller_1.updateCategory);
router.delete('/:id', (0, validation_1.validate)(category_validator_1.categoryIdSchema), category_controller_1.deleteCategory);
router.post('/bulk-delete', category_controller_1.bulkDeleteCategories);
router.post('/:id/tasks', (0, validation_1.validate)(category_validator_1.categoryIdSchema), category_controller_1.updateCategoryTasks);
exports.default = router;
//# sourceMappingURL=category.routes.js.map