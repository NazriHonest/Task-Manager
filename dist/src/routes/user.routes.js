"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
// Protected routes - require authentication
router.get('/profile', auth_1.authenticate, user_controller_1.getProfile);
router.put('/profile', auth_1.authenticate, (0, validation_1.validate)(auth_validator_1.updateProfileSchema), user_controller_1.updateProfile);
router.put('/password', auth_1.authenticate, user_controller_1.changePassword);
router.post('/avatar', auth_1.authenticate, user_controller_1.uploadAvatar);
router.delete('/account', auth_1.authenticate, user_controller_1.deleteAccount);
exports.default = router;
//# sourceMappingURL=user.routes.js.map