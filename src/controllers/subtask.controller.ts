import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';

//const prisma = new PrismaClient();

// Get subtasks for a task
export const getSubtasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      data: { subtasks }
    });

  } catch (error) {
    console.error('Get subtasks error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Create subtask
export const createSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Subtask title is required'
      });
    }

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const subtask = await prisma.subtask.create({
      data: {
        title: title.trim(),
        taskId
      }
    });

    return res.status(201).json({
      status: 'success',
      message: 'Subtask created successfully',
      data: { subtask }
    });

  } catch (error) {
    console.error('Create subtask error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Toggle subtask completion
export const toggleSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId, subtaskId } = req.params;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const subtask = await prisma.subtask.findFirst({
      where: {
        id: subtaskId,
        taskId
      }
    });

    if (!subtask) {
      return res.status(404).json({
        status: 'error',
        message: 'Subtask not found'
      });
    }

    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        isCompleted: !subtask.isCompleted
      }
    });

    return res.status(200).json({
      status: 'success',
      message: `Subtask marked as ${updatedSubtask.isCompleted ? 'completed' : 'incomplete'}`,
      data: { subtask: updatedSubtask }
    });

  } catch (error) {
    console.error('Toggle subtask error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Delete subtask
export const deleteSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId, subtaskId } = req.params;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const subtask = await prisma.subtask.findFirst({
      where: {
        id: subtaskId,
        taskId
      }
    });

    if (!subtask) {
      return res.status(404).json({
        status: 'error',
        message: 'Subtask not found'
      });
    }

    await prisma.subtask.delete({
      where: { id: subtaskId }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Subtask deleted successfully'
    });

  } catch (error) {
    console.error('Delete subtask error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};