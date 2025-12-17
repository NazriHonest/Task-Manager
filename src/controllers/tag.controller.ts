import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  CreateTagInput,
  UpdateTagInput,
  TagIdParams,
  TagQueryParams,
  TagTaskInput
} from '../validators/tag.validator';

//const prisma = new PrismaClient();

// Get all tags
export const getTags = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const query = req.query as unknown as TagQueryParams;

    // Build where conditions
    const where: any = { userId };
    if (query.search) {
      where.name = {
        contains: query.search
        // mode: 'insensitive' // Not supported in SQLite, case-insensitive search handled differently for SQLite
      };
    }

    // Base query
    const tags = await prisma.tag.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // If we need task counts, fetch them separately
    if (query.includeTaskCount) {
      const tagsWithCounts = await Promise.all(
        tags.map(async (tag) => {
          const taskCount = await prisma.taskTag.count({
            where: { tagId: tag.id }
          });
          return {
            ...tag,
            taskCount
          };
        })
      );
      
      return res.status(200).json({
        status: 'success',
        data: { tags: tagsWithCounts }
      });
    }

    // If we need tasks, fetch them separately
    if (query.withTasks) {
      const tagsWithTasks = await Promise.all(
        tags.map(async (tag) => {
          const taskTags = await prisma.taskTag.findMany({
            where: { tagId: tag.id },
            take: 5,
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  priority: true,
                  dueDate: true,
                  createdAt: true
                }
              }
            }
          });

          // Sort by task's createdAt
          taskTags.sort((a, b) => 
            new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime()
          );

          return {
            ...tag,
            tasks: taskTags.map(taskTag => taskTag.task)
          };
        })
      );

      return res.status(200).json({
        status: 'success',
        data: { tags: tagsWithTasks }
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { tags }
    });

  } catch (error) {
    console.error('Get tags error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get single tag
export const getTag = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as TagIdParams;

    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }

    // Get tasks for this tag
    const taskTags = await prisma.taskTag.findMany({
      where: { tagId: id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }
      }
    });

    // Sort by task's createdAt
    taskTags.sort((a, b) => 
      new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime()
    );

    const taskCount = await prisma.taskTag.count({
      where: { tagId: id }
    });

    const transformedTag = {
      ...tag,
      tasks: taskTags.map(taskTag => taskTag.task),
      taskCount
    };

    return res.status(200).json({
      status: 'success',
      data: { tag: transformedTag }
    });

  } catch (error) {
    console.error('Get tag error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Create new tag
export const createTag = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateTagInput = req.body;

    // Check if tag with same name already exists for this user
    const existingTag = await prisma.tag.findFirst({
      where: {
        userId,
        name: data.name
      }
    });

    if (existingTag) {
      return res.status(400).json({
        status: 'error',
        message: 'A tag with this name already exists'
      });
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color || '#757575',
        userId
      }
    });

    return res.status(201).json({
      status: 'success',
      message: 'Tag created successfully',
      data: { tag }
    });

  } catch (error) {
    console.error('Create tag error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Update tag
export const updateTag = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as TagIdParams;
    const data: UpdateTagInput = req.body;

    // Check if tag exists and belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }

    // Check if new name conflicts with another tag
    if (data.name && data.name !== tag.name) {
      const existingTag = await prisma.tag.findFirst({
        where: {
          userId,
          name: data.name,
          NOT: { id }
        }
      });

      if (existingTag) {
        return res.status(400).json({
          status: 'error',
          message: 'A tag with this name already exists'
        });
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Tag updated successfully',
      data: { tag: updatedTag }
    });

  } catch (error) {
    console.error('Update tag error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Delete tag
export const deleteTag = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as TagIdParams;

    // Check if tag exists and belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }

    // Delete tag (cascade will handle TaskTag relationships)
    await prisma.tag.delete({
      where: { id }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Tag deleted successfully'
    });

  } catch (error) {
    console.error('Delete tag error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Bulk delete tags
export const bulkDeleteTags = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tagIds } = req.body;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'tagIds must be a non-empty array'
      });
    }

    // Check if all tags exist and belong to user
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        userId
      }
    });

    if (tags.length !== tagIds.length) {
      return res.status(404).json({
        status: 'error',
        message: 'One or more tags not found'
      });
    }

    // Delete tags
    await prisma.tag.deleteMany({
      where: {
        id: { in: tagIds },
        userId
      }
    });

    return res.status(200).json({
      status: 'success',
      message: `${tags.length} tag(s) deleted successfully`
    });

  } catch (error) {
    console.error('Bulk delete tags error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get tag statistics
export const getTagStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const stats = await prisma.$transaction(async (tx) => {
      // Get all tags
      const tags = await tx.tag.findMany({
        where: { userId }
      });

      // Get statistics for each tag
      const tagStats = await Promise.all(
        tags.map(async (tag) => {
          // Get tasks for this tag
          const taskTags = await tx.taskTag.findMany({
            where: { tagId: tag.id },
            include: {
              task: {
                select: {
                  id: true,
                  status: true,
                  priority: true
                }
              }
            }
          });

          const tasks = taskTags.map(taskTag => taskTag.task);
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
          const pendingTasks = tasks.filter(task => task.status === 'PENDING').length;
          const highPriorityTasks = tasks.filter(task => task.priority === 'HIGH').length;
          const criticalPriorityTasks = tasks.filter(task => task.priority === 'CRITICAL').length;

          return {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            totalTasks,
            completedTasks,
            pendingTasks,
            highPriorityTasks,
            criticalPriorityTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          };
        })
      );

      // Get all task tags for the user
      const allTaskTags = await tx.taskTag.findMany({
        where: {
          tag: { userId }
        },
        include: {
          task: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      const allTasks = allTaskTags.map(taskTag => taskTag.task);
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(task => task.status === 'COMPLETED').length;
      const totalTags = tags.length;
      const tagsWithTasks = tagStats.filter(tag => tag.totalTasks > 0).length;

      // Most used tags
      const mostUsedTags = tagStats
        .sort((a, b) => b.totalTasks - a.totalTasks)
        .slice(0, 5);

      // Most productive tags (by completion rate)
      const mostProductiveTags = tagStats
        .filter(tag => tag.totalTasks >= 3)
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 5);

      return {
        tags: tagStats,
        summary: {
          totalTags,
          tagsWithTasks,
          totalTasks,
          completedTasks,
          overallCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        insights: {
          mostUsedTags,
          mostProductiveTags
        }
      };
    });

    return res.status(200).json({
      status: 'success',
      data: stats
    });

  } catch (error) {
    console.error('Get tag stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Assign or remove tags from tasks
export const updateTagTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as TagIdParams;
    const { taskIds, action }: TagTaskInput = req.body;

    // Check if tag exists and belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }

    // Check if all tasks exist and belong to user
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId
      }
    });

    if (tasks.length !== taskIds.length) {
      return res.status(404).json({
        status: 'error',
        message: 'One or more tasks not found'
      });
    }

    if (action === 'assign') {
      // Assign tag to tasks (skip if already assigned)
      const assignments = taskIds.map(taskId => ({
        taskId,
        tagId: id
      }));

      // Create assignments, handle duplicates manually for SQLite compatibility
      for (const assignment of assignments) {
        try {
          await prisma.taskTag.create({
            data: assignment
          });
        } catch (error) {
          // If duplicate, continue to next assignment
          continue;
        }
      }

    } else if (action === 'remove') {
      // Remove tag from tasks
      await prisma.taskTag.deleteMany({
        where: {
          tagId: id,
          taskId: { in: taskIds }
        }
      });
    }

    // Get updated task count
    const taskCount = await prisma.taskTag.count({
      where: { tagId: id }
    });

    const updatedTag = {
      ...tag,
      taskCount
    };

    return res.status(200).json({
      status: 'success',
      message: `Tag ${action === 'assign' ? 'assigned to' : 'removed from'} ${taskIds.length} task(s)`,
      data: { tag: updatedTag }
    });

  } catch (error) {
    console.error('Update tag tasks error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get popular tags (most used)
export const getPopularTags = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get tags with task counts
    const tags = await prisma.tag.findMany({
      where: { userId }
    });

    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        const taskCount = await prisma.taskTag.count({
          where: { tagId: tag.id }
        });
        return {
          ...tag,
          taskCount
        };
      })
    );

    // Sort by task count and limit
    const popularTags = tagsWithCounts
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, limit);

    return res.status(200).json({
      status: 'success',
      data: { tags: popularTags }
    });

  } catch (error) {
    console.error('Get popular tags error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Search tags by name
export const searchTags = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    const tags = await prisma.tag.findMany({
      where: {
        userId,
        name: {
          contains: q.trim()
          // mode: 'insensitive' // Not supported in SQLite, case-insensitive search handled differently for SQLite
        }
      },
      take: 10
    });

    return res.status(200).json({
      status: 'success',
      data: { tags }
    });

  } catch (error) {
    console.error('Search tags error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};