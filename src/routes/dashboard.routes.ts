import { Router } from 'express';
import {
  getDashboardStats,
  getProductivityAnalytics,
  getUserActivity,
  getProjectAnalytics,
  getPerformanceMetrics
} from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  dashboardStatsSchema,
  productivityAnalyticsSchema,
  userActivitySchema,
  projectAnalyticsSchema,
  performanceMetricsSchema
} from '../validators/dashboard.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard overview
router.get('/stats', validate(dashboardStatsSchema), getDashboardStats);

// Productivity analytics (charts data)
router.get('/analytics/productivity', validate(productivityAnalyticsSchema), getProductivityAnalytics);

// User activity logs
router.get('/activity', validate(userActivitySchema), getUserActivity);

// Performance metrics
router.get('/metrics', validate(performanceMetricsSchema), getPerformanceMetrics);

// Project-specific analytics
router.get('/projects/:projectId', validate(projectAnalyticsSchema), getProjectAnalytics);

export default router;