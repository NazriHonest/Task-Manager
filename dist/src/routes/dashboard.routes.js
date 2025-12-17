"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const dashboard_validator_1 = require("../validators/dashboard.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Dashboard overview
router.get('/stats', (0, validation_1.validate)(dashboard_validator_1.dashboardStatsSchema), dashboard_controller_1.getDashboardStats);
// Productivity analytics (charts data)
router.get('/analytics/productivity', (0, validation_1.validate)(dashboard_validator_1.productivityAnalyticsSchema), dashboard_controller_1.getProductivityAnalytics);
// User activity logs
router.get('/activity', (0, validation_1.validate)(dashboard_validator_1.userActivitySchema), dashboard_controller_1.getUserActivity);
// Performance metrics
router.get('/metrics', (0, validation_1.validate)(dashboard_validator_1.performanceMetricsSchema), dashboard_controller_1.getPerformanceMetrics);
// Project-specific analytics
router.get('/projects/:projectId', (0, validation_1.validate)(dashboard_validator_1.projectAnalyticsSchema), dashboard_controller_1.getProjectAnalytics);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map