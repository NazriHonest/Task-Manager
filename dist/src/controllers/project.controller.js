"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectStats = exports.updateMemberRole = exports.removeProjectMember = exports.addProjectMember = exports.getProjectTasks = exports.deleteProject = exports.updateProject = exports.createProject = exports.getProject = exports.getProjects = void 0;
const prisma_1 = require("../../lib/prisma");
//const prisma = new PrismaClient();
// Helper function to calculate project progress
const calculateProjectProgress = async (projectId) => {
    const tasks = await prisma_1.prisma.task.findMany({
        where: { projectId },
        select: { status: true }
    });
    if (tasks.length === 0)
        return 0;
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    return Math.round((completedTasks / tasks.length) * 100);
};
// Get all projects
const getProjects = async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = req.query;
        // Build filter conditions
        const where = {
            OR: [
                { userId }, // User owns the project
                { members: { some: { userId } } } // User is a member
            ],
            ...(query.search && {
                OR: [
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { description: { contains: query.search, mode: 'insensitive' } }
                ]
            })
        };
        // Build orderBy
        const orderBy = {};
        orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';
        // Build include object
        const include = {
            _count: {
                select: {
                    tasks: true,
                    members: true
                }
            }
        };
        if (query.includeTasks) {
            include.tasks = {
                take: 5, // Limit recent tasks
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    dueDate: true
                }
            };
        }
        if (query.includeMembers) {
            include.members = {
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
            };
        }
        const projects = await prisma_1.prisma.project.findMany({
            where,
            include,
            orderBy
        });
        // Calculate progress for each project
        const projectsWithProgress = await Promise.all(projects.map(async (project) => {
            const progress = await calculateProjectProgress(project.id);
            // Update progress in database if different
            if (project.progress !== progress) {
                await prisma_1.prisma.project.update({
                    where: { id: project.id },
                    data: { progress }
                });
            }
            return {
                ...project,
                progress,
                isOwner: project.userId === userId
            };
        }));
        return res.status(200).json({
            status: 'success',
            data: { projects: projectsWithProgress }
        });
    }
    catch (error) {
        console.error('Get projects error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getProjects = getProjects;
// Get single project
const getProject = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    { members: { some: { userId } } }
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
                tasks: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        dueDate: true,
                        createdAt: true
                    }
                },
                members: {
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
                        tasks: true,
                        members: true
                    }
                }
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found'
            });
        }
        // Calculate current progress
        const progress = await calculateProjectProgress(project.id);
        // Update progress if different
        if (project.progress !== progress) {
            await prisma_1.prisma.project.update({
                where: { id: project.id },
                data: { progress }
            });
        }
        const projectWithProgress = {
            ...project,
            progress,
            isOwner: project.userId === userId
        };
        return res.status(200).json({
            status: 'success',
            data: { project: projectWithProgress }
        });
    }
    catch (error) {
        console.error('Get project error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getProject = getProject;
// Create new project
const createProject = async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = req.body;
        const project = await prisma_1.prisma.project.create({
            data: {
                name: data.name,
                description: data.description,
                color: data.color || '#6200EE',
                startDate: data.startDate,
                endDate: data.endDate,
                userId
            },
            include: {
                _count: {
                    select: {
                        tasks: true,
                        members: true
                    }
                }
            }
        });
        return res.status(201).json({
            status: 'success',
            message: 'Project created successfully',
            data: {
                project: {
                    ...project,
                    isOwner: true
                }
            }
        });
    }
    catch (error) {
        console.error('Create project error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.createProject = createProject;
// Update project
const updateProject = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const data = req.body;
        // Check if project exists and user has permission
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId }, // Owner can update
                    { members: { some: { userId, role: 'ADMIN' } } } // Admin members can update
                ]
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found or you do not have permission to update'
            });
        }
        // Calculate progress if tasks were completed
        let progress = data.progress;
        if (data.progress === undefined) {
            progress = await calculateProjectProgress(id);
        }
        const updatedProject = await prisma_1.prisma.project.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                startDate: data.startDate,
                endDate: data.endDate,
                progress
            },
            include: {
                _count: {
                    select: {
                        tasks: true,
                        members: true
                    }
                }
            }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Project updated successfully',
            data: {
                project: {
                    ...updatedProject,
                    isOwner: updatedProject.userId === userId
                }
            }
        });
    }
    catch (error) {
        console.error('Update project error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateProject = updateProject;
// Delete project
const deleteProject = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Check if project exists and user is owner
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                userId // Only owner can delete
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found or you do not have permission to delete'
            });
        }
        // Delete project (cascade will handle related records)
        await prisma_1.prisma.project.delete({
            where: { id }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Project deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete project error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.deleteProject = deleteProject;
// Get project tasks
const getProjectTasks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Check if user has access to project
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    { members: { some: { userId } } }
                ]
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found'
            });
        }
        const tasks = await prisma_1.prisma.task.findMany({
            where: { projectId: id },
            include: {
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
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        attachments: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Transform tags
        const transformedTasks = tasks.map(task => ({
            ...task,
            tags: task.tags.map(tag => tag.tag)
        }));
        return res.status(200).json({
            status: 'success',
            data: { tasks: transformedTasks }
        });
    }
    catch (error) {
        console.error('Get project tasks error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getProjectTasks = getProjectTasks;
// Add member to project
const addProjectMember = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const data = req.body;
        // Check if project exists and user is owner/admin
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId }, // Owner
                    { members: { some: { userId, role: 'ADMIN' } } } // Admin
                ]
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found or you do not have permission to add members'
            });
        }
        // Resolve user by userId or email
        let userToAdd = null;
        let resolvedUserId;
        if (data.userId) {
            resolvedUserId = data.userId;
            userToAdd = await prisma_1.prisma.user.findUnique({ where: { id: resolvedUserId } });
        }
        else if (data.email) {
            userToAdd = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
            if (userToAdd)
                resolvedUserId = userToAdd.id;
        }
        if (!userToAdd || !resolvedUserId) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        // Check if user is already a member
        const existingMember = await prisma_1.prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId: resolvedUserId
            }
        });
        if (existingMember) {
            return res.status(400).json({
                status: 'error',
                message: 'User is already a member of this project'
            });
        }
        // Add member
        const member = await prisma_1.prisma.projectMember.create({
            data: {
                projectId: id,
                userId: resolvedUserId,
                role: data.role || 'MEMBER'
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
        // TODO: Send notification to the added user
        return res.status(201).json({
            status: 'success',
            message: 'Member added successfully',
            data: { member }
        });
    }
    catch (error) {
        console.error('Add project member error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.addProjectMember = addProjectMember;
// Remove member from project
const removeProjectMember = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, memberId } = req.params;
        // Check if project exists and user has permission
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId }, // Owner
                    { members: { some: { userId, role: 'ADMIN' } } } // Admin
                ]
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found or you do not have permission to remove members'
            });
        }
        // Prevent owner from being removed
        if (project.userId === memberId) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot remove project owner'
            });
        }
        // Check if member exists
        const member = await prisma_1.prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId: memberId
            }
        });
        if (!member) {
            return res.status(404).json({
                status: 'error',
                message: 'Member not found'
            });
        }
        // Remove member
        await prisma_1.prisma.projectMember.delete({
            where: {
                id: member.id
            }
        });
        // TODO: Send notification to the removed user
        return res.status(200).json({
            status: 'success',
            message: 'Member removed successfully'
        });
    }
    catch (error) {
        console.error('Remove project member error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.removeProjectMember = removeProjectMember;
// Update member role
const updateMemberRole = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, memberId } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({
                status: 'error',
                message: 'Role is required'
            });
        }
        // Check if project exists and user has permission
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId }, // Only owner can change roles
                ]
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found or you do not have permission to update roles'
            });
        }
        // Check if member exists
        const member = await prisma_1.prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId: memberId
            }
        });
        if (!member) {
            return res.status(404).json({
                status: 'error',
                message: 'Member not found'
            });
        }
        // Update role
        const updatedMember = await prisma_1.prisma.projectMember.update({
            where: { id: member.id },
            data: { role },
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
            message: 'Member role updated successfully',
            data: { member: updatedMember }
        });
    }
    catch (error) {
        console.error('Update member role error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateMemberRole = updateMemberRole;
// Get project statistics
const getProjectStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Check if user has access to project
        const project = await prisma_1.prisma.project.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    { members: { some: { userId } } }
                ]
            }
        });
        if (!project) {
            return res.status(404).json({
                status: 'error',
                message: 'Project not found'
            });
        }
        const stats = await prisma_1.prisma.$transaction(async (tx) => {
            const tasks = await tx.task.findMany({
                where: { projectId: id }
            });
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
            const pendingTasks = tasks.filter(task => task.status === 'PENDING').length;
            const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS').length;
            const highPriorityTasks = tasks.filter(task => task.priority === 'HIGH').length;
            const criticalPriorityTasks = tasks.filter(task => task.priority === 'CRITICAL').length;
            const membersCount = await tx.projectMember.count({
                where: { projectId: id }
            });
            const overdueTasks = tasks.filter(task => {
                if (!task.dueDate)
                    return false;
                return task.dueDate < new Date() &&
                    (task.status === 'PENDING' || task.status === 'IN_PROGRESS');
            }).length;
            return {
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks,
                highPriorityTasks,
                criticalPriorityTasks,
                membersCount: membersCount + 1, // Include owner
                overdueTasks,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            };
        });
        return res.status(200).json({
            status: 'success',
            data: { stats }
        });
    }
    catch (error) {
        console.error('Get project stats error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getProjectStats = getProjectStats;
//# sourceMappingURL=project.controller.js.map