"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategoryTasks = exports.getCategoryStats = exports.bulkDeleteCategories = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategory = exports.getCategories = void 0;
const prisma_1 = require("../../lib/prisma");
//const prisma = new PrismaClient();
// Get all categories
const getCategories = async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = req.query;
        // Build include object
        const include = {};
        if (query.withTasks) {
            include.tasks = {
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    dueDate: true,
                    createdAt: true
                }
            };
        }
        if (query.includeTaskCount) {
            include._count = {
                select: { tasks: true }
            };
        }
        const categories = await prisma_1.prisma.category.findMany({
            where: { userId },
            include,
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({
            status: 'success',
            data: { categories }
        });
    }
    catch (error) {
        console.error('Get categories error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getCategories = getCategories;
// Get single category
const getCategory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const category = await prisma_1.prisma.category.findFirst({
            where: {
                id,
                userId
            },
            include: {
                tasks: {
                    orderBy: { createdAt: 'desc' },
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
                        }
                    }
                },
                _count: {
                    select: {
                        tasks: true
                    }
                }
            }
        });
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        return res.status(200).json({
            status: 'success',
            data: { category }
        });
    }
    catch (error) {
        console.error('Get category error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getCategory = getCategory;
// Create new category
const createCategory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = req.body;
        // Check if category with same name already exists for this user
        const existingCategory = await prisma_1.prisma.category.findFirst({
            where: {
                userId,
                name: data.name
            }
        });
        if (existingCategory) {
            return res.status(400).json({
                status: 'error',
                message: 'A category with this name already exists'
            });
        }
        const category = await prisma_1.prisma.category.create({
            data: {
                name: data.name,
                color: data.color || '#6200EE',
                icon: data.icon,
                userId
            },
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });
        return res.status(201).json({
            status: 'success',
            message: 'Category created successfully',
            data: { category }
        });
    }
    catch (error) {
        console.error('Create category error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.createCategory = createCategory;
// Update category
const updateCategory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const data = req.body;
        // Check if category exists and belongs to user
        const category = await prisma_1.prisma.category.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        // Check if new name conflicts with another category
        if (data.name && data.name !== category.name) {
            const existingCategory = await prisma_1.prisma.category.findFirst({
                where: {
                    userId,
                    name: data.name,
                    NOT: { id }
                }
            });
            if (existingCategory) {
                return res.status(400).json({
                    status: 'error',
                    message: 'A category with this name already exists'
                });
            }
        }
        const updatedCategory = await prisma_1.prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                color: data.color,
                icon: data.icon
            },
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Category updated successfully',
            data: { category: updatedCategory }
        });
    }
    catch (error) {
        console.error('Update category error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateCategory = updateCategory;
// Delete category
const deleteCategory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // Check if category exists and belongs to user
        const category = await prisma_1.prisma.category.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        // Check if category has tasks
        const taskCount = await prisma_1.prisma.task.count({
            where: { categoryId: id }
        });
        if (taskCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete category with ${taskCount} task(s). Please reassign or delete the tasks first.`
            });
        }
        // Delete category
        await prisma_1.prisma.category.delete({
            where: { id }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Category deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete category error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.deleteCategory = deleteCategory;
// Bulk delete categories (delete empty categories)
const bulkDeleteCategories = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { categoryIds } = req.body;
        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'categoryIds must be a non-empty array'
            });
        }
        // Check if all categories exist and belong to user
        const categories = await prisma_1.prisma.category.findMany({
            where: {
                id: { in: categoryIds },
                userId
            },
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });
        if (categories.length !== categoryIds.length) {
            return res.status(404).json({
                status: 'error',
                message: 'One or more categories not found'
            });
        }
        // Check for categories with tasks
        const categoriesWithTasks = categories.filter(cat => cat._count.tasks > 0);
        if (categoriesWithTasks.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete categories with tasks: ${categoriesWithTasks.map(cat => cat.name).join(', ')}`
            });
        }
        // Delete categories
        await prisma_1.prisma.category.deleteMany({
            where: {
                id: { in: categoryIds },
                userId
            }
        });
        return res.status(200).json({
            status: 'success',
            message: `${categories.length} category(ies) deleted successfully`
        });
    }
    catch (error) {
        console.error('Bulk delete categories error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.bulkDeleteCategories = bulkDeleteCategories;
// Get category statistics
const getCategoryStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await prisma_1.prisma.$transaction(async (tx) => {
            // Get all categories with their task counts
            const categories = await tx.category.findMany({
                where: { userId },
                include: {
                    tasks: {
                        select: {
                            id: true,
                            status: true,
                            priority: true
                        }
                    }
                }
            });
            // Calculate statistics
            const categoryStats = categories.map(category => {
                const tasks = category.tasks;
                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
                const pendingTasks = tasks.filter(task => task.status === 'PENDING').length;
                const highPriorityTasks = tasks.filter(task => task.priority === 'HIGH').length;
                const criticalPriorityTasks = tasks.filter(task => task.priority === 'CRITICAL').length;
                return {
                    id: category.id,
                    name: category.name,
                    color: category.color,
                    icon: category.icon,
                    totalTasks,
                    completedTasks,
                    pendingTasks,
                    highPriorityTasks,
                    criticalPriorityTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                };
            });
            // Overall statistics
            const allTasks = categories.flatMap(cat => cat.tasks);
            const totalTasks = allTasks.length;
            const completedTasks = allTasks.filter(task => task.status === 'COMPLETED').length;
            const totalCategories = categories.length;
            const categoriesWithTasks = categories.filter(cat => cat.tasks.length > 0).length;
            return {
                categories: categoryStats,
                summary: {
                    totalCategories,
                    categoriesWithTasks,
                    totalTasks,
                    completedTasks,
                    overallCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                }
            };
        });
        return res.status(200).json({
            status: 'success',
            data: stats
        });
    }
    catch (error) {
        console.error('Get category stats error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getCategoryStats = getCategoryStats;
// Update category tasks (move tasks to/from category)
const updateCategoryTasks = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { taskIds, action } = req.body;
        if (!Array.isArray(taskIds)) {
            return res.status(400).json({
                status: 'error',
                message: 'taskIds must be an array'
            });
        }
        if (!['assign', 'remove'].includes(action)) {
            return res.status(400).json({
                status: 'error',
                message: 'action must be either "assign" or "remove"'
            });
        }
        // Check if category exists and belongs to user
        const category = await prisma_1.prisma.category.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        // Check if all tasks exist and belong to user
        const tasks = await prisma_1.prisma.task.findMany({
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
        // Update tasks
        if (action === 'assign') {
            // Assign tasks to this category
            await prisma_1.prisma.task.updateMany({
                where: {
                    id: { in: taskIds },
                    userId
                },
                data: {
                    categoryId: id
                }
            });
        }
        else if (action === 'remove') {
            // Remove tasks from this category (set categoryId to null)
            await prisma_1.prisma.task.updateMany({
                where: {
                    id: { in: taskIds },
                    userId,
                    categoryId: id
                },
                data: {
                    categoryId: null
                }
            });
        }
        // Get updated category with task count
        const updatedCategory = await prisma_1.prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });
        return res.status(200).json({
            status: 'success',
            message: `${taskIds.length} task(s) ${action === 'assign' ? 'assigned to' : 'removed from'} category`,
            data: { category: updatedCategory }
        });
    }
    catch (error) {
        console.error('Update category tasks error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateCategoryTasks = updateCategoryTasks;
//# sourceMappingURL=category.controller.js.map