"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubtask = exports.toggleSubtask = exports.createSubtask = exports.getSubtasks = void 0;
const prisma_1 = require("../../lib/prisma");
//const prisma = new PrismaClient();
// Get subtasks for a task
const getSubtasks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { taskId } = req.params;
        // Verify task belongs to user
        const task = await prisma_1.prisma.task.findFirst({
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
        const subtasks = await prisma_1.prisma.subtask.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' }
        });
        return res.status(200).json({
            status: 'success',
            data: { subtasks }
        });
    }
    catch (error) {
        console.error('Get subtasks error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getSubtasks = getSubtasks;
// Create subtask
const createSubtask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { taskId } = req.params;
        const { title } = req.body;
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Subtask title is required'
            });
        }
        // Verify task belongs to user
        const task = await prisma_1.prisma.task.findFirst({
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
        const subtask = await prisma_1.prisma.subtask.create({
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
    }
    catch (error) {
        console.error('Create subtask error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.createSubtask = createSubtask;
// Toggle subtask completion
const toggleSubtask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { taskId, subtaskId } = req.params;
        // Verify task belongs to user
        const task = await prisma_1.prisma.task.findFirst({
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
        const subtask = await prisma_1.prisma.subtask.findFirst({
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
        const updatedSubtask = await prisma_1.prisma.subtask.update({
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
    }
    catch (error) {
        console.error('Toggle subtask error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.toggleSubtask = toggleSubtask;
// Delete subtask
const deleteSubtask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { taskId, subtaskId } = req.params;
        // Verify task belongs to user
        const task = await prisma_1.prisma.task.findFirst({
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
        const subtask = await prisma_1.prisma.subtask.findFirst({
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
        await prisma_1.prisma.subtask.delete({
            where: { id: subtaskId }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Subtask deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete subtask error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.deleteSubtask = deleteSubtask;
//# sourceMappingURL=subtask.controller.js.map