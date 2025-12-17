import { z } from 'zod';

export const dashboardStatsSchema = z.object({
  query: z.object({
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional(),
    projectId: z.string()
      .uuid('Invalid project ID')
      .optional()
  })
});

export const productivityAnalyticsSchema = z.object({
  query: z.object({
    period: z.enum(['day', 'week', 'month', 'year'])
      .default('month')
      .optional(),
    groupBy: z.enum(['day', 'week', 'month'])
      .default('day')
      .optional(),
    projectId: z.string()
      .uuid('Invalid project ID')
      .optional()
  })
});

export const userActivitySchema = z.object({
  query: z.object({
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional(),
    limit: z.string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .default('20')
      .optional()
  })
});

export const projectAnalyticsSchema = z.object({
  params: z.object({
    projectId: z.string()
      .uuid('Invalid project ID')
  }),
  query: z.object({
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
  })
});

export const performanceMetricsSchema = z.object({
  query: z.object({
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
  })
});

// Type exports
export type DashboardStatsQuery = z.infer<typeof dashboardStatsSchema>['query'];
export type ProductivityAnalyticsQuery = z.infer<typeof productivityAnalyticsSchema>['query'];
export type UserActivityQuery = z.infer<typeof userActivitySchema>['query'];
export type ProjectAnalyticsParams = z.infer<typeof projectAnalyticsSchema>['params'];
export type ProjectAnalyticsQuery = z.infer<typeof projectAnalyticsSchema>['query'];
export type PerformanceMetricsQuery = z.infer<typeof performanceMetricsSchema>['query'];