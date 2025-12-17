import { Request, Response } from 'express';
import { TaskStatus, Priority, Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  DashboardStatsQuery,
  ProductivityAnalyticsQuery,
  UserActivityQuery,
  ProjectAnalyticsParams,
  ProjectAnalyticsQuery,
  PerformanceMetricsQuery
} from '../validators/dashboard.validator';

// Helper function to calculate date ranges
const getDateRange = (startDate?: string, endDate?: string) => {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  
  if (!endDate) {
    end.setHours(23, 59, 59, 999);
  }
  
  if (!startDate) {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }
  
  return { start, end };
};

// Helper to format dates for grouping
const formatDateForGrouping = (date: Date, groupBy: 'day' | 'week' | 'month'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (groupBy) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week':
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    case 'month':
      return `${year}-${month}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

// Helper to log activity
const logActivity = async (
  userId: string,
  action: string,
  entityId?: string,
  entityType?: string,
  metadata?: any
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityId,
        entityType,
        metadata
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Get dashboard overview statistics
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const query = req.query as unknown as DashboardStatsQuery;
    const { start, end } = getDateRange(query.startDate, query.endDate);

    // Build base where conditions
    const baseWhere: any = {
      userId,
      createdAt: { gte: start, lte: end }
    };

    if (query.projectId) {
      baseWhere.projectId = query.projectId;
    }

    // Get counts in parallel
    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      totalComments,
      totalAttachments,
      priorityStats,
      recentActivities
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({ where: baseWhere }),

      // Completed tasks - FIX: Use string literal
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED' as TaskStatus
        }
      }),

      // Pending tasks - FIX: Use string literal
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'PENDING' as TaskStatus
        }
      }),

      // In Progress tasks - FIX: Use string literal
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'IN_PROGRESS' as TaskStatus
        }
      }),

      // Overdue tasks - FIX: Use array of string literals
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { in: ['PENDING', 'IN_PROGRESS'] as TaskStatus[] },
          dueDate: { lt: new Date() }
        }
      }),

      // Total projects
      prisma.project.count({
        where: {
          userId,
          createdAt: { gte: start, lte: end }
        }
      }),

      // Active projects
      prisma.project.count({
        where: {
          userId,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),

      // Total comments
      prisma.comment.count({
        where: {
          userId,
          createdAt: { gte: start, lte: end }
        }
      }),

      // Total attachments
      prisma.attachment.count({
        where: {
          userId,
          createdAt: { gte: start, lte: end }
        }
      }),

      // Priority statistics
      prisma.task.groupBy({
        by: ['priority'],
        where: baseWhere,
        _count: true
      }),

      // Recent activities
      prisma.task.findMany({
        where: baseWhere,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate completion rate
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Format priority stats
    const priorityDistribution = priorityStats.reduce((acc, stat) => {
      acc[stat.priority.toLowerCase()] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    // Get upcoming tasks - FIX: Use array of string literals
    const upcomingTasks = await prisma.task.findMany({
      where: {
        ...baseWhere,
        status: { in: ['PENDING', 'IN_PROGRESS'] as TaskStatus[] },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    // Get project progress - FIX: Use string literal
    const projects = await prisma.project.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end }
      },
      select: {
        id: true,
        name: true,
        progress: true,
        color: true,
        _count: {
          select: {
            tasks: {
              where: {
                status: 'COMPLETED' as TaskStatus
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    // Log activity
    await logActivity(userId, 'dashboard_viewed', '', 'dashboard', {
      dateRange: { start, end },
      projectId: query.projectId
    });

    return res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks,
          overdueTasks,
          completionRate: `${completionRate}%`,
          totalProjects,
          activeProjects,
          totalComments,
          totalAttachments
        },
        priorityDistribution,
        recentActivities,
        upcomingTasks,
        topProjects: projects,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get productivity analytics
export const getProductivityAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const query = req.query as unknown as ProductivityAnalyticsQuery;
    
    const end = new Date();
    const start = new Date();
    
    switch (query.period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const baseWhere: any = {
      userId,
      createdAt: { gte: start, lte: end }
    };

    if (query.projectId) {
      baseWhere.projectId = query.projectId;
    }

    const tasks = await prisma.task.findMany({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        priority: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const productivityData: Record<string, {
      date: string;
      tasksCreated: number;
      tasksCompleted: number;
      completionRate: number;
      priorityBreakdown: Record<string, number>;
    }> = {};

    tasks.forEach(task => {
      const dateKey = formatDateForGrouping(task.createdAt, query.groupBy || 'day');
      
      if (!productivityData[dateKey]) {
        productivityData[dateKey] = {
          date: dateKey,
          tasksCreated: 0,
          tasksCompleted: 0,
          completionRate: 0,
          priorityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 }
        };
      }

      productivityData[dateKey].tasksCreated++;

      // FIX: Compare with string literal
      if (task.status === 'COMPLETED' && task.completedAt) {
        productivityData[dateKey].tasksCompleted++;
      }

      const priorityKey = task.priority.toLowerCase();
      productivityData[dateKey].priorityBreakdown[priorityKey]++;

      if (productivityData[dateKey].tasksCreated > 0) {
        productivityData[dateKey].completionRate = Math.round(
          (productivityData[dateKey].tasksCompleted / productivityData[dateKey].tasksCreated) * 100
        );
      }
    });

    const chartData = Object.values(productivityData).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Get completed tasks - FIX: Use string literal
    const completedTasks = await prisma.task.findMany({
      where: {
        ...baseWhere,
        status: 'COMPLETED' as TaskStatus,
        completedAt: { not: null },
        //createdAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    let totalCompletionHours = 0;
    completedTasks.forEach(task => {
      if (task.createdAt && task.completedAt) {
        const hours = (task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
        totalCompletionHours += hours;
      }
    });

    const avgCompletionHours = completedTasks.length > 0 
      ? totalCompletionHours / completedTasks.length 
      : 0;

    await logActivity(userId, 'analytics_viewed', '', 'analytics', {
      period: query.period,
      groupBy: query.groupBy,
      projectId: query.projectId
    });

    return res.status(200).json({
      status: 'success',
      data: {
        period: query.period,
        groupBy: query.groupBy,
        chartData,
        trends: {
          averageCompletionTime: `${avgCompletionHours.toFixed(1)} hours`
        },
        summary: {
          totalTasks: tasks.length,
          // FIX: Compare with string literal
          completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
          completionRate: tasks.length > 0 
            ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100)
            : 0
        },
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get productivity analytics error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get user activity logs
export const getUserActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const query = req.query as unknown as UserActivityQuery;
    const { start, end } = getDateRange(query.startDate, query.endDate);
    const limit = query.limit || 20;

    const activities = await prisma.activityLog.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const activitySummary = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: start, lte: end }
      },
      _count: true
    });

    const formattedActivities = activities.map(activity => {
      let message = '';
      let icon = '📝';
      
      switch (activity.action) {
        case 'task_created':
          message = `Created a new task`;
          icon = '📋';
          break;
        case 'task_completed':
          message = `Completed a task`;
          icon = '✅';
          break;
        case 'comment_added':
          message = `Added a comment`;
          icon = '💬';
          break;
        case 'attachment_uploaded':
          message = `Uploaded a file`;
          icon = '📎';
          break;
        case 'dashboard_viewed':
          message = `Viewed dashboard`;
          icon = '📊';
          break;
        default:
          message = activity.action.replace(/_/g, ' ');
          icon = '📝';
      }

      return {
        ...activity,
        message,
        icon,
        timestamp: activity.createdAt
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        activities: formattedActivities,
        summary: activitySummary,
        total: activities.length,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get project-specific analytics
export const getProjectAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params as ProjectAnalyticsParams;
    const query = req.query as unknown as ProjectAnalyticsQuery;
    const { start, end } = getDateRange(query.startDate, query.endDate);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId },
          {
            members: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found or you do not have access'
      });
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        createdAt: { gte: start, lte: end }
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    const totalTasks = tasks.length;
    // FIX: Use string literals
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const priorityStats = tasks.reduce((acc, task) => {
      const priority = task.priority.toLowerCase();
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByMember = tasks.reduce((acc, task) => {
      const memberId = task.user.id;
      if (!acc[memberId]) {
        acc[memberId] = {
          user: task.user,
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0
        };
      }
      
      acc[memberId].total++;
      // FIX: Use string literals
      if (task.status === 'COMPLETED') acc[memberId].completed++;
      if (task.status === 'IN_PROGRESS') acc[memberId].inProgress++;
      if (task.status === 'PENDING') acc[memberId].pending++;
      
      return acc;
    }, {} as Record<string, any>);

    const timelineData: Record<string, { created: number; completed: number }> = {};
    
    tasks.forEach(task => {
      const dateKey = task.createdAt.toISOString().split('T')[0];
      
      if (!timelineData[dateKey]) {
        timelineData[dateKey] = { created: 0, completed: 0 };
      }
      
      timelineData[dateKey].created++;
      
      // FIX: Use string literal
      if (task.status === 'COMPLETED' && task.completedAt) {
        const completedDateKey = task.completedAt.toISOString().split('T')[0];
        if (!timelineData[completedDateKey]) {
          timelineData[completedDateKey] = { created: 0, completed: 0 };
        }
        timelineData[completedDateKey].completed++;
      }
    });

    const timeline = Object.entries(timelineData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const recentActivity = await prisma.comment.findMany({
      where: {
        task: { projectId },
        createdAt: { gte: start, lte: end }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // FIX: Use array of string literals
    const overdueTasks = tasks.filter(t => 
      t.dueDate && t.dueDate < new Date() && 
      ['PENDING', 'IN_PROGRESS'].includes(t.status)
    ).length;

    await logActivity(userId, 'project_analytics_viewed', projectId, 'project', {
      dateRange: { start, end }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
          progress: project.progress,
          owner: project.user,
          memberCount: project._count.members,
          taskCount: project._count.tasks
        },
        statistics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          completionRate: `${completionRate}%`,
          overdueTasks
        },
        priorityDistribution: priorityStats,
        tasksByMember: Object.values(tasksByMember),
        timeline,
        recentActivity,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get project analytics error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get performance metrics
export const getPerformanceMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const query = req.query as unknown as PerformanceMetricsQuery;
    const { start, end } = getDateRange(query.startDate, query.endDate);

    // FIX: Use string literal
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED' as TaskStatus,
        completedAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        completedAt: true,
        priority: true
      }
    });

    if (tasks.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          message: 'No completed tasks found in the selected date range',
          metrics: {}
        }
      });
    }

    const completionTimes = tasks.map(task => {
      if (task.completedAt) {
        const created = new Date(task.createdAt).getTime();
        const completed = new Date(task.completedAt).getTime();
        return (completed - created) / (1000 * 60 * 60);
      }
      return 0;
    }).filter(time => time > 0);

    const totalCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0);
    const averageCompletionTime = completionTimes.length > 0 
      ? totalCompletionTime / completionTimes.length 
      : 0;

    const sortedTimes = [...completionTimes].sort((a, b) => a - b);
    const medianCompletionTime = completionTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;

    const maxExpectedTime = 168;
    const efficiencyScore = completionTimes.length > 0
      ? Math.round(Math.max(0, 100 - (averageCompletionTime / maxExpectedTime * 100)))
      : 0;

    const allTasks = await prisma.task.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end }
      },
      select: {
        priority: true,
        status: true
      }
    });

    const priorityCompletion: Record<string, { total: number; completed: number; rate: number }> = {};

    allTasks.forEach(task => {
      const priority = task.priority.toLowerCase();
      if (!priorityCompletion[priority]) {
        priorityCompletion[priority] = { total: 0, completed: 0, rate: 0 };
      }
      
      priorityCompletion[priority].total++;
      // FIX: Use string literal
      if (task.status === 'COMPLETED') {
        priorityCompletion[priority].completed++;
      }
    });

    Object.keys(priorityCompletion).forEach(priority => {
      const stats = priorityCompletion[priority];
      stats.rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });

    const completedDates = tasks
      .map(task => task.completedAt?.toISOString().split('T')[0])
      .filter(date => date) as string[];

    const uniqueDates = [...new Set(completedDates)];
    uniqueDates.sort();

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = today;

    while (uniqueDates.includes(checkDate)) {
      currentStreak++;
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - 1);
      checkDate = prevDate.toISOString().split('T')[0];
    }

    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    await logActivity(userId, 'performance_metrics_viewed', '', 'metrics', {
      dateRange: { start, end }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          completionTime: {
            average: `${averageCompletionTime.toFixed(1)} hours`,
            median: `${medianCompletionTime.toFixed(1)} hours`,
            fastest: completionTimes.length > 0 ? `${Math.min(...completionTimes).toFixed(1)} hours` : 'N/A',
            slowest: completionTimes.length > 0 ? `${Math.max(...completionTimes).toFixed(1)} hours` : 'N/A',
            totalTasks: completionTimes.length
          },
          efficiency: {
            score: efficiencyScore,
            rating: efficiencyScore >= 80 ? 'Excellent' : 
                   efficiencyScore >= 60 ? 'Good' : 
                   efficiencyScore >= 40 ? 'Average' : 'Needs Improvement'
          },
          priorityCompletion,
          streaks: {
            current: currentStreak,
            longest: longestStreak,
            totalDaysWithCompletion: uniqueDates.length
          },
          summary: {
            totalTasksAnalyzed: allTasks.length,
            completedTasks: tasks.length,
            overallCompletionRate: allTasks.length > 0 
              ? Math.round((tasks.length / allTasks.length) * 100) 
              : 0
          }
        },
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};