"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskStats = exports.toggleTaskCompletion = exports.deleteTask = exports.updateTask = exports.createTask = exports.getTask = exports.getTasks = void 0;
const client_1 = require("../../generated/prisma/client");
const prisma_1 = require("../../lib/prisma");
// Helper: check if a user is project owner or member (any role)
const userIsProjectMemberOrOwner = async (userId, projectId) => {
    const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
    if (!project)
        return false;
    if (project.userId === userId)
        return true;
    const member = await prisma_1.prisma.projectMember.findFirst({ where: { projectId, userId } });
    return !!member;
};
// Helper: check if user can modify a task (task owner OR project owner OR project member with ADMIN role)
const userCanModifyTask = async (userId, taskId) => {
    const task = await prisma_1.prisma.task.findUnique({ where: { id: taskId } });
    if (!task)
        return false;
    if (task.userId === userId)
        return true; // task owner
    // Check project owner
    if (task.projectId) {
        const project = await prisma_1.prisma.project.findUnique({ where: { id: task.projectId } });
        if (project && project.userId === userId)
            return true;
        // Check membership with ADMIN role
        const member = await prisma_1.prisma.projectMember.findFirst({ where: { projectId: task.projectId, userId } });
        if (member && member.role === 'ADMIN')
            return true;
    }
    return false;
};
// Helper: check if a user has a specific role in a project
const userHasProjectRole = async (userId, projectId, role) => {
    const project = await prisma_1.prisma.project.findUnique({ where: { id: projectId } });
    if (!project)
        return false;
    // Project owner has all permissions
    if (project.userId === userId)
        return true;
    // Check for specific role
    const member = await prisma_1.prisma.projectMember.findFirst({
        where: { projectId, userId, role }
    });
    return !!member;
};
// Helper: check if a user has ADMIN role in a project
const userHasAdminRoleInProject = async (userId, projectId) => {
    return await userHasProjectRole(userId, projectId, 'ADMIN');
};
// Helper: validate project access for creation
const validateProjectAccessForCreation = async (userId, projectId) => {
    if (!projectId)
        return true; // Personal task
    const project = await prisma_1.prisma.project.findFirst({
        where: {
            id: projectId,
            OR: [
                { userId }, // project owner
                { members: { some: { userId, role: 'ADMIN' } } } // admin member
            ]
        }
    });
    return !!project;
};
//const prisma = new PrismaClient();
// Get all tasks with filtering and pagination
const getTasks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = req.query;
        // Build filter conditions
        const where = {
            userId,
            ...(query.status && { status: query.status }),
            ...(query.priority && { priority: query.priority }),
            ...(query.projectId && { projectId: query.projectId }),
            ...(query.categoryId && { categoryId: query.categoryId }),
            ...(query.dueDateFrom && { dueDate: { gte: query.dueDateFrom } }),
            ...(query.dueDateTo && { dueDate: { lte: query.dueDateTo } }),
            ...(query.search && {
                OR: [
                    { title: { contains: query.search, mode: 'insensitive' } },
                    { description: { contains: query.search, mode: 'insensitive' } }
                ]
            })
        };
        // Handle tag filter
        if (query.tagId) {
            where.tags = {
                some: {
                    tagId: query.tagId
                }
            };
        }
        // Calculate pagination
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        // Build orderBy
        const orderBy = {};
        orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';
        // Get tasks with total count
        const [tasks, total] = await Promise.all([
            prisma_1.prisma.task.findMany({
                where,
                include: {
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
                    },
                    tags: {
                        include: {
                            tag: {
                                select: {
                                    id: true,
                                    name: true,
                                    color: true
                                }
                            }
                        }
                    },
                    subtasks: {
                        select: {
                            id: true,
                            title: true,
                            isCompleted: true
                        },
                        orderBy: { createdAt: 'asc' }
                    },
                    _count: {
                        select: {
                            comments: true,
                            attachments: true,
                            subtasks: true
                        }
                    }
                },
                orderBy,
                skip,
                take: limit
            }),
            prisma_1.prisma.task.count({ where })
        ]);
        // Transform tags
        const transformedTasks = tasks.map(task => ({
            ...task,
            tags: task.tags.map(tag => tag.tag)
        }));
        return res.status(200).json({
            status: 'success',
            data: {
                tasks: transformedTasks,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Get tasks error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getTasks = getTasks;
// Get single task by ID
const getTask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Allow access to task for: task owner, project owner, or project members
        const task = await prisma_1.prisma.task.findFirst({
            where: {
                id,
                OR: [
                    { userId }, // task owner
                    { project: { userId } }, // project owner
                    { project: { members: { some: { userId } } } } // project member
                ]
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        description: true
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        icon: true
                    }
                },
                tags: {
                    include: {
                        tag: {
                            select: {
                                id: true,
                                name: true,
                                color: true
                            }
                        }
                    }
                },
                subtasks: {
                    orderBy: { createdAt: 'asc' }
                },
                comments: {
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
                    orderBy: { createdAt: 'desc' }
                },
                attachments: {
                    orderBy: { createdAt: 'desc' }
                },
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
        if (!task) {
            return res.status(404).json({
                status: 'error',
                message: 'Task not found'
            });
        }
        // Transform tags
        const transformedTask = {
            ...task,
            tags: task.tags.map(tag => tag.tag)
        };
        return res.status(200).json({
            status: 'success',
            data: { task: transformedTask }
        });
    }
    catch (error) {
        console.error('Get task error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getTask = getTask;
// Create new task
const createTask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = req.body;
        // Validate project access for creation
        if (data.projectId) {
            const hasPermission = await validateProjectAccessForCreation(userId, data.projectId);
            if (!hasPermission) {
                return res.status(403).json({
                    status: 'error',
                    message: 'You do not have permission to create tasks in this project'
                });
            }
        }
        // Validate category belongs to user
        if (data.categoryId) {
            const category = await prisma_1.prisma.category.findFirst({
                where: {
                    id: data.categoryId,
                    userId
                }
            });
            if (!category) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Category not found or you do not have permission'
                });
            }
        }
        // Validate tags belong to user
        if (data.tagIds && data.tagIds.length > 0) {
            const tags = await prisma_1.prisma.tag.findMany({
                where: {
                    id: { in: data.tagIds },
                    userId
                }
            });
            if (tags.length !== data.tagIds.length) {
                return res.status(404).json({
                    status: 'error',
                    message: 'One or more tags not found or you do not have permission'
                });
            }
        }
        // Create task with transaction
        const task = await prisma_1.prisma.$transaction(async (tx) => {
            // Create the task
            const newTask = await tx.task.create({
                data: {
                    title: data.title,
                    description: data.description,
                    status: data.status || client_1.TaskStatus.PENDING,
                    priority: data.priority || client_1.Priority.MEDIUM,
                    dueDate: data.dueDate,
                    projectId: data.projectId,
                    categoryId: data.categoryId,
                    userId
                },
                include: {
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
            });
            // Add tags if provided
            if (data.tagIds && data.tagIds.length > 0) {
                await tx.taskTag.createMany({
                    data: data.tagIds.map(tagId => ({
                        taskId: newTask.id,
                        tagId
                    }))
                });
            }
            // Get full task with tags
            const fullTask = await tx.task.findUnique({
                where: { id: newTask.id },
                include: {
                    project: true,
                    category: true,
                    tags: {
                        include: {
                            tag: true
                        }
                    }
                }
            });
            return fullTask;
        });
        // Transform tags
        const transformedTask = {
            ...task,
            tags: task.tags.map(tag => tag.tag)
        };
        return res.status(201).json({
            status: 'success',
            message: 'Task created successfully',
            data: { task: transformedTask }
        });
    }
    catch (error) {
        console.error('Create task error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.createTask = createTask;
// Update task
const updateTask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const data = req.body;
        // Check if user can modify this task
        const canModify = await userCanModifyTask(userId, id);
        if (!canModify) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to update this task'
            });
        }
        // Validate project belongs to user or user has admin role in project
        if (data.projectId) {
            const hasProjectPermission = await validateProjectAccessForCreation(userId, data.projectId);
            if (!hasProjectPermission) {
                return res.status(403).json({
                    status: 'error',
                    message: 'You do not have permission to move this task to this project'
                });
            }
        }
        // Validate category belongs to user
        if (data.categoryId) {
            const category = await prisma_1.prisma.category.findFirst({
                where: {
                    id: data.categoryId,
                    userId
                }
            });
            if (!category) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Category not found or you do not have permission'
                });
            }
        }
        // Update task with transaction
        const task = await prisma_1.prisma.$transaction(async (tx) => {
            // Update task
            const updatedTask = await tx.task.update({
                where: { id },
                data: {
                    title: data.title,
                    description: data.description,
                    status: data.status,
                    priority: data.priority,
                    dueDate: data.dueDate,
                    completedAt: data.completedAt,
                    projectId: data.projectId,
                    categoryId: data.categoryId
                }
            });
            // Update tags if provided
            if (data.tagIds) {
                // Remove existing tags
                await tx.taskTag.deleteMany({
                    where: { taskId: id }
                });
                // Add new tags
                if (data.tagIds.length > 0) {
                    await tx.taskTag.createMany({
                        data: data.tagIds.map(tagId => ({
                            taskId: id,
                            tagId
                        }))
                    });
                }
            }
            // Get full task with relations
            const fullTask = await tx.task.findUnique({
                where: { id },
                include: {
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
                    },
                    tags: {
                        include: {
                            tag: true
                        }
                    },
                    subtasks: true,
                    _count: {
                        select: {
                            comments: true,
                            attachments: true,
                            subtasks: true
                        }
                    }
                }
            });
            return fullTask;
        });
        // Transform tags
        const transformedTask = {
            ...task,
            tags: task.tags.map(tag => tag.tag)
        };
        return res.status(200).json({
            status: 'success',
            message: 'Task updated successfully',
            data: { task: transformedTask }
        });
    }
    catch (error) {
        console.error('Update task error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateTask = updateTask;
// Delete task
const deleteTask = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Check if user can modify this task
        const canModify = await userCanModifyTask(userId, id);
        if (!canModify) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to delete this task'
            });
        }
        // Delete task (cascade will handle related records)
        await prisma_1.prisma.task.delete({
            where: { id }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Task deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete task error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.deleteTask = deleteTask;
// Mark task as complete/incomplete
const toggleTaskCompletion = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { completed } = req.body;
        if (typeof completed !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'Completed status is required (true/false)'
            });
        }
        // Check if user can modify this task
        const canModify = await userCanModifyTask(userId, id);
        if (!canModify) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to update this task'
            });
        }
        const updatedTask = await prisma_1.prisma.task.update({
            where: { id },
            data: {
                status: completed ? client_1.TaskStatus.COMPLETED : client_1.TaskStatus.PENDING,
                completedAt: completed ? new Date() : null
            },
            include: {
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
        });
        return res.status(200).json({
            status: 'success',
            message: `Task marked as ${completed ? 'completed' : 'incomplete'}`,
            data: { task: updatedTask }
        });
    }
    catch (error) {
        console.error('Toggle task completion error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.toggleTaskCompletion = toggleTaskCompletion;
// Get task statistics
const getTaskStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await prisma_1.prisma.$transaction(async (tx) => {
            const total = await tx.task.count({ where: { userId } });
            const completed = await tx.task.count({
                where: {
                    userId,
                    status: client_1.TaskStatus.COMPLETED
                }
            });
            const pending = await tx.task.count({
                where: {
                    userId,
                    status: client_1.TaskStatus.PENDING
                }
            });
            const inProgress = await tx.task.count({
                where: {
                    userId,
                    status: client_1.TaskStatus.IN_PROGRESS
                }
            });
            const cancelled = await tx.task.count({
                where: {
                    userId,
                    status: client_1.TaskStatus.CANCELLED
                }
            });
            const overdue = await tx.task.count({
                where: {
                    userId,
                    dueDate: {
                        lt: new Date()
                    },
                    status: {
                        in: [client_1.TaskStatus.PENDING, client_1.TaskStatus.IN_PROGRESS]
                    }
                }
            });
            const highPriority = await tx.task.count({
                where: {
                    userId,
                    priority: client_1.Priority.HIGH,
                    status: {
                        in: [client_1.TaskStatus.PENDING, client_1.TaskStatus.IN_PROGRESS]
                    }
                }
            });
            const criticalPriority = await tx.task.count({
                where: {
                    userId,
                    priority: client_1.Priority.CRITICAL,
                    status: {
                        in: [client_1.TaskStatus.PENDING, client_1.TaskStatus.IN_PROGRESS]
                    }
                }
            });
            return {
                total,
                completed,
                pending,
                inProgress,
                cancelled,
                overdue,
                highPriority,
                criticalPriority,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        });
        return res.status(200).json({
            status: 'success',
            data: { stats }
        });
    }
    catch (error) {
        console.error('Get task stats error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getTaskStats = getTaskStats;
//# sourceMappingURL=task.controller.js.map