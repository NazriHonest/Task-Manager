import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  CreateCommentInput,
  UpdateCommentInput,
  CommentIdParams,
  TaskCommentsParams,
  TaskCommentsQuery
} from '../validators/comment.validator';

//const prisma = new PrismaClient();

// Helper function to build comment tree
const buildCommentTree = (comments: any[]) => {
  const commentMap = new Map();
  const rootComments: any[] = [];

  // Create map of comments by id
  comments.forEach(comment => {
    commentMap.set(comment.id, {
      ...comment,
      replies: []
    });
  });

  // Build tree structure
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id);
    
    if (comment.parentId && commentMap.has(comment.parentId)) {
      const parent = commentMap.get(comment.parentId);
      parent.replies.push(commentNode);
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
};

// Get all comments for a task
export const getTaskComments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params as TaskCommentsParams;
    const query = req.query as unknown as TaskCommentsQuery;

    // Check if task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { userId },
          {
            project: {
              members: {
                some: { userId }
              }
            }
          }
        ]
      }
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found or you do not have access'
      });
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'asc';

    // Get comments
    const comments = await prisma.comment.findMany({
      where: {
        taskId,
        ...(query.includeReplies ? {} : { parentId: null }) // Only top-level comments if not including replies
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
        // Use aggregation to get reply count
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy
    });

    // Build comment tree if including replies
    let resultComments;
    if (query.includeReplies) {
      // Get all comments including replies
      const allComments = await prisma.comment.findMany({
        where: { taskId },
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
              replies: true
            }
          }
        },
        orderBy: { createdAt: 'asc' } // Sort chronologically for tree building
      });

      resultComments = buildCommentTree(allComments);
    } else {
      resultComments = comments;
    }

    return res.status(200).json({
      status: 'success',
      data: { 
        comments: resultComments,
        total: comments.length
      }
    });

  } catch (error) {
    console.error('Get task comments error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get single comment
export const getComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as CommentIdParams;

    const comment = await prisma.comment.findFirst({
      where: {
        id,
        task: {
          OR: [
            { userId },
            {
              project: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        }
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
        task: {
          select: {
            id: true,
            title: true,
            projectId: true
          }
        },
        replies: {
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
                replies: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found or you do not have access'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { comment }
    });

  } catch (error) {
    console.error('Get comment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Create new comment
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params as TaskCommentsParams;
    const data: CreateCommentInput = req.body;

    // Check if task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { userId },
          {
            project: {
              members: {
                some: { userId }
              }
            }
          }
        ]
      }
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found or you do not have access'
      });
    }

    // Check if parent comment exists and belongs to same task
    if (data.parentId) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: data.parentId,
          taskId
        }
      });

      if (!parentComment) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent comment not found'
        });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content.trim(),
        taskId,
        userId,
        parentId: data.parentId
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
      }
    });

    return res.status(201).json({
      status: 'success',
      message: 'Comment created successfully',
      data: { comment }
    });

  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Update comment
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as CommentIdParams;
    const data: UpdateCommentInput = req.body;

    // Check if comment exists and belongs to user
    const comment = await prisma.comment.findFirst({
      where: {
        id,
        userId // Only comment owner can update
      }
    });

    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found or you do not have permission to update'
      });
    }

    // Check if comment is not too old to edit (optional: 15 minutes limit)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment cannot be edited after 15 minutes'
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        content: data.content.trim(),
        updatedAt: new Date() // Update the updatedAt timestamp
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
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Comment updated successfully',
      data: { comment: updatedComment }
    });

  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Delete comment
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as CommentIdParams;

    // Check if comment exists
    const comment = await prisma.comment.findFirst({
      where: { id },
      include: {
        task: {
          select: {
            userId: true,
            project: {
              select: {
                userId: true,
                members: {
                  where: { userId },
                  select: { role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Check permissions:
    // 1. Comment owner can delete
    // 2. Task owner can delete
    // 3. Project owner can delete
    // 4. Project admin can delete
    const isCommentOwner = comment.userId === userId;
    const isTaskOwner = comment.task.userId === userId;
    const isProjectOwner = comment.task.project?.userId === userId;
    const isProjectAdmin = comment.task.project?.members.some(member => member.role === 'ADMIN');

    if (!isCommentOwner && !isTaskOwner && !isProjectOwner && !isProjectAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this comment'
      });
    }

    // Delete comment (cascade will handle replies)
    await prisma.comment.delete({
      where: { id }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get comment replies
export const getCommentReplies = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as CommentIdParams;

    // Check if comment exists and user has access
    const comment = await prisma.comment.findFirst({
      where: {
        id,
        task: {
          OR: [
            { userId },
            {
              project: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        }
      }
    });

    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found or you do not have access'
      });
    }

    const replies = await prisma.comment.findMany({
      where: { parentId: id },
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
            replies: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      data: { replies }
    });

  } catch (error) {
    console.error('Get comment replies error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get user's comments
export const getUserComments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = '20', page = '1' } = req.query;

    const limitNum = parseInt(limit as string) || 20;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              projectId: true
            }
          },
          _count: {
            select: {
              replies: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.comment.count({
        where: { userId }
      })
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        comments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user comments error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Search comments
export const searchComments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { q, taskId } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    // Build where conditions
    const where: any = {
      content: {
        contains: q.trim(),
        mode: 'insensitive'
      },
      task: {
        OR: [
          { userId },
          {
            project: {
              members: {
                some: { userId }
              }
            }
          }
        ]
      }
    };

    if (taskId && typeof taskId === 'string') {
      where.taskId = taskId;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.status(200).json({
      status: 'success',
      data: { comments }
    });

  } catch (error) {
    console.error('Search comments error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};