import { NotificationType } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { socketService } from '../lib/socket';
import { emailService } from '../lib/email';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: any;
  taskId?: string;
  projectId?: string;
  commentId?: string;
}

// Type interfaces for database results
interface CommentUserId {
  userId: string | null;
}

interface ProjectMemberUserId {
  userId: string | null;
}

class NotificationService {
  // Create and send a notification
  async createNotification(data: CreateNotificationInput) {
    try {
      // Check user's notification preferences
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId: data.userId }
      });

      // If user has disabled in-app notifications for this type, don't create
      if (preferences && !this.shouldSendNotification(preferences, data.type)) {
        console.log(`Notification type ${data.type} disabled for user ${data.userId}`);
        return null;
      }

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata,
          taskId: data.taskId,
          projectId: data.projectId,
          commentId: data.commentId,
          isEmailSent: false
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
              title: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Send real-time notification via Socket.io
      socketService.sendToUser(data.userId, 'newNotification', {
        notification,
        timestamp: new Date().toISOString()
      });

      // Send email notification if enabled
      if (preferences?.email && this.shouldSendEmail(preferences, data.type)) {
        await this.sendEmailNotification(notification, preferences);
      }

      console.log(`Notification created for user ${data.userId}: ${data.type}`);
      return notification;

    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  // Create notifications for multiple users
  async createNotificationsForUsers(userIds: string[], data: Omit<CreateNotificationInput, 'userId'>) {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await this.createNotification({
        ...data,
        userId
      });
      
      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Create notification for all project members (except sender)
  async createNotificationForProjectMembers(projectId: string, excludeUserId: string, data: Omit<CreateNotificationInput, 'userId'>) {
    // Get all project members
    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
        userId: { not: excludeUserId }
      },
      select: { userId: true }
    });

    // Type-safe extraction of userIds with explicit type annotation
    const userIds = members
      .filter((member: ProjectMemberUserId): member is { userId: string } => 
        member.userId !== null
      )
      .map(member => member.userId);

    return this.createNotificationsForUsers(userIds, data);
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
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

    // Notify via socket
    socketService.sendToUser(userId, 'notificationRead', {
      notificationId,
      timestamp: new Date().toISOString()
    });

    return updated;
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    // Notify via socket
    socketService.sendToUser(userId, 'allNotificationsRead', {
      timestamp: new Date().toISOString()
    });

    return { message: 'All notifications marked as read' };
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    // Notify via socket
    socketService.sendToUser(userId, 'notificationDeleted', {
      notificationId,
      timestamp: new Date().toISOString()
    });

    return { message: 'Notification deleted' };
  }

  // Get user notifications
  async getUserNotifications(userId: string, options?: {
    limit?: number;
    page?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  }) {
    const limit = options?.limit || 20;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    
    if (options?.unreadOnly) {
      where.isRead = false;
    }
    
    if (options?.type) {
      where.type = options.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          },
          comment: {
            select: {
              id: true,
              content: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ 
        where: { ...where, isRead: false }
      })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      unreadCount
    };
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string) {
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: { userId }
      });
    }

    return preferences;
  }

  // Update notification preferences
  async updateNotificationPreferences(userId: string, data: any) {
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: { userId, ...data }
      });
    } else {
      preferences = await prisma.notificationPreferences.update({
        where: { userId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    }

    return preferences;
  }

  // Helper: Check if notification should be sent based on preferences
  private shouldSendNotification(preferences: any, type: NotificationType): boolean {
    if (!preferences.inApp) return false;

    switch (type) {
      case 'TASK_ASSIGNED':
        return preferences.taskAssigned;
      case 'TASK_UPDATED':
        return preferences.taskUpdated;
      case 'TASK_COMPLETED':
        return preferences.taskCompleted;
      case 'TASK_OVERDUE':
        return preferences.taskOverdue;
      case 'TASK_REMINDER':
        return preferences.taskOverdue;
      case 'COMMENT_ADDED':
        return preferences.commentAdded;
      case 'COMMENT_MENTION':
        return preferences.commentMention;
      case 'PROJECT_INVITE':
        return preferences.projectInvite;
      case 'PROJECT_UPDATE':
        return preferences.projectUpdate;
      case 'SYSTEM_ALERT':
        return preferences.systemAlert;
      default:
        return true;
    }
  }

  // Helper: Check if email should be sent
  private shouldSendEmail(preferences: any, type: NotificationType): boolean {
    if (!preferences.email) return false;
    return this.shouldSendNotification(preferences, type);
  }

  // Helper: Send email notification
  private async sendEmailNotification(notification: any, preferences: any) {
    try {
      let emailSent = false;

      switch (notification.type) {
        case 'TASK_ASSIGNED':
          if (notification.metadata?.taskId && notification.metadata?.assignedBy) {
            emailSent = await emailService.sendTaskAssignedEmail(
              notification.userId,
              notification.metadata.taskId,
              notification.metadata.assignedBy
            );
          }
          break;

        case 'COMMENT_MENTION':
          if (notification.metadata?.commentId && notification.metadata?.mentionedBy) {
            emailSent = await emailService.sendCommentMentionEmail(
              notification.userId,
              notification.metadata.commentId,
              notification.metadata.mentionedBy
            );
          }
          break;

        case 'PROJECT_INVITE':
          if (notification.metadata?.projectId && notification.metadata?.invitedBy) {
            emailSent = await emailService.sendProjectInviteEmail(
              notification.userId,
              notification.metadata.projectId,
              notification.metadata.invitedBy
            );
          }
          break;

        default:
          // Generic email for other notification types
          emailSent = await emailService.sendEmail({
            to: notification.user.email,
            subject: notification.title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #6200EE;">${notification.title}</h2>
                <p>${notification.message}</p>
                ${notification.task ? `<p><strong>Task:</strong> ${notification.task.title}</p>` : ''}
                ${notification.project ? `<p><strong>Project:</strong> ${notification.project.name}</p>` : ''}
                <p style="color: #666; font-size: 14px;">
                  You can adjust your notification preferences in your account settings.
                </p>
              </div>
            `
          });
      }

      // Update notification if email was sent
      if (emailSent) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { isEmailSent: true }
        });
      }

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Utility methods for common notification scenarios
  async notifyTaskAssigned(taskId: string, assignedToUserId: string, assignedByUserId: string) {
    const [task, assignedBy] = await Promise.all([
      prisma.task.findUnique({ 
        where: { id: taskId },
        include: { project: true }
      }),
      prisma.user.findUnique({ where: { id: assignedByUserId } })
    ]);

    if (!task || !assignedBy) return null;

    return this.createNotification({
      userId: assignedToUserId,
      title: 'New Task Assigned',
      message: `You have been assigned to task "${task.title}" by ${assignedBy.name || assignedBy.email}`,
      type: 'TASK_ASSIGNED',
      metadata: {
        taskId,
        assignedBy: assignedByUserId,
        taskTitle: task.title
      },
      taskId
    });
  }

  async notifyTaskUpdated(taskId: string, updatedByUserId: string, changes: string[]) {
    const [task, updatedBy, taskData] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId } }),
      prisma.user.findUnique({ where: { id: updatedByUserId } }),
      prisma.task.findUnique({ 
        where: { id: taskId },
        select: { userId: true }
      })
    ]);

    if (!task || !updatedBy || !taskData) return null;

    const notifications = [];

    // Notify task owner (if not the updater)
    if (taskData.userId && taskData.userId !== updatedByUserId) {
      const notification = await this.createNotification({
        userId: taskData.userId,
        title: 'Task Updated',
        message: `Your task "${task.title}" was updated by ${updatedBy.name || updatedBy.email}. Changes: ${changes.join(', ')}`,
        type: 'TASK_UPDATED',
        metadata: {
          taskId,
          updatedBy: updatedByUserId,
          changes
        },
        taskId
      });
      
      if (notification) notifications.push(notification);
    }

    // Notify project members if it's a project task
    if (task.projectId) {
      const projectNotifications = await this.createNotificationForProjectMembers(
        task.projectId,
        updatedByUserId,
        {
          title: 'Task Updated',
          message: `Task "${task.title}" was updated by ${updatedBy.name || updatedBy.email}. Changes: ${changes.join(', ')}`,
          type: 'TASK_UPDATED',
          metadata: {
            taskId,
            updatedBy: updatedByUserId,
            changes
          },
          taskId,
          projectId: task.projectId
        }
      );
      
      if (projectNotifications) {
        notifications.push(...projectNotifications);
      }
    }

    return notifications;
  }

  async notifyCommentAdded(commentId: string, taskId: string, mentionedUserIds: string[] = []) {
    try {
      // Get comment data first
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          content: true,
          userId: true,
          taskId: true
        }
      });

      if (!comment) {
        console.error('Comment not found:', commentId);
        return null;
      }

      // Get task data
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          userId: true,
          projectId: true
        }
      });

      if (!task) {
        console.error('Task not found:', taskId);
        return null;
      }

      // Get commenter user data
      const commenterUser = await prisma.user.findUnique({
        where: { id: comment.userId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (!commenterUser) {
        console.error('Commenter not found:', comment.userId);
        return null;
      }

      const notifications = [];
      const commenter = comment.userId;

      // Notify task owner (if not the commenter)
      if (task.userId && task.userId !== commenter) {
        const notification = await this.createNotification({
          userId: task.userId,
          title: 'New Comment',
          message: `${commenterUser.name || commenterUser.email} commented on your task "${task.title}"`,
          type: 'COMMENT_ADDED',
          metadata: {
            commentId,
            taskId,
            commenter,
            commentPreview: comment.content.substring(0, 100)
          },
          taskId,
          commentId
        });
        
        if (notification) notifications.push(notification);
      }

      // Notify mentioned users
      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId !== commenter) {
          const mentionedUser = await prisma.user.findUnique({
            where: { id: mentionedUserId },
            select: { name: true, email: true }
          });
          
          if (mentionedUser) {
            const notification = await this.createNotification({
              userId: mentionedUserId,
              title: 'You were mentioned',
              message: `${commenterUser.name || commenterUser.email} mentioned you in a comment on task "${task.title}"`,
              type: 'COMMENT_MENTION',
              metadata: {
                commentId,
                taskId,
                commenter,
                mentionedBy: commenter
              },
              taskId,
              commentId
            });
            
            if (notification) notifications.push(notification);
          }
        }
      }

      // Notify other commenters on the same task (if project task)
      if (task.projectId) {
        // Get unique user IDs of other commenters
        const otherComments = await prisma.comment.findMany({
          where: {
            taskId,
            userId: { 
              not: commenter // Exclude current commenter
            }
          },
          select: {
            userId: true
          },
          distinct: ['userId']
        });

        // Type-safe extraction of userIds with explicit type annotation
        const otherCommenterIds = otherComments
          .filter((commentData: CommentUserId): commentData is { userId: string } => 
            commentData.userId !== null
          )
          .map(commentData => commentData.userId)
          .filter(id => 
            id && 
            id !== task.userId && 
            !mentionedUserIds.includes(id)
          );

        if (otherCommenterIds.length > 0) {
          const projectNotifications = await this.createNotificationsForUsers(
            otherCommenterIds,
            {
              title: 'New Comment',
              message: `${commenterUser.name || commenterUser.email} also commented on task "${task.title}"`,
              type: 'COMMENT_ADDED',
              metadata: {
                commentId,
                taskId,
                commenter
              },
              taskId,
              commentId,
              projectId: task.projectId
            }
          );
          
          if (projectNotifications) {
            notifications.push(...projectNotifications);
          }
        }
      }

      return notifications;

    } catch (error) {
      console.error('Error in notifyCommentAdded:', error);
      return null;
    }
  }

  async checkOverdueTasks() {
    try {
      const overdueTasks = await prisma.task.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] as any[] },
          dueDate: {
            lt: new Date(),
            not: null
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const notifications = [];

      for (const task of overdueTasks) {
        // Only send reminder if it hasn't been sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: task.user.id,
            taskId: task.id,
            type: 'TASK_OVERDUE',
            createdAt: {
              gte: today
            }
          }
        });

        if (!existingNotification) {
          const notification = await this.createNotification({
            userId: task.user.id,
            title: 'Task Overdue',
            message: `Your task "${task.title}" is overdue. Due date was ${task.dueDate?.toLocaleDateString()}`,
            type: 'TASK_OVERDUE',
            metadata: {
              taskId: task.id,
              dueDate: task.dueDate,
              overdueSince: new Date()
            },
            taskId: task.id
          });
          
          if (notification) notifications.push(notification);
        }
      }

      return notifications;

    } catch (error) {
      console.error('Error checking overdue tasks:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();