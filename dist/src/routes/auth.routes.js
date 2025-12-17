"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_1 = require("../middleware/validation");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
router.post('/register', (0, validation_1.validate)(auth_validator_1.registerSchema), auth_controller_1.AuthController.register);
router.post('/login', (0, validation_1.validate)(auth_validator_1.loginSchema), auth_controller_1.AuthController.login);
router.post('/refresh', auth_controller_1.AuthController.refreshToken);
router.post('/forgot-password', (0, validation_1.validate)(auth_validator_1.forgotPasswordSchema), auth_controller_1.AuthController.forgotPassword);
router.post('/reset-password', (0, validation_1.validate)(auth_validator_1.resetPasswordSchema), auth_controller_1.AuthController.resetPassword);
router.post('/logout', auth_controller_1.AuthController.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map