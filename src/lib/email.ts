import nodemailer from 'nodemailer';
import { prisma } from '../../lib/prisma';

//const prisma = new PrismaClient();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log('Email service initialized');
    } else {
      console.log('Email service disabled - no email configuration found');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email service not configured, skipping email send');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"Task Manager" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '')
      });
      
      console.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Notification email templates
  async sendTaskAssignedEmail(userId: string, taskId: string, assignedByUserId: string) {
  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      console.error('User not found:', userId);
      return false;
    }

    // Get task data
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!task) {
      console.error('Task not found:', taskId);
      return false;
    }

    // Get assigned by user data
    const assignedBy = await prisma.user.findUnique({
      where: { id: assignedByUserId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!assignedBy) {
      console.error('Assigned by user not found:', assignedByUserId);
      return false;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6200EE;">New Task Assigned</h2>
        <p>Hello ${user.name || user.email},</p>
        <p>You have been assigned a new task by ${assignedBy.name || assignedBy.email}:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${task.title}</h3>
          ${task.description ? `<p>${task.description}</p>` : ''}
          ${task.project ? `<p><strong>Project:</strong> ${task.project.name}</p>` : ''}
          ${task.dueDate ? `<p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks/${task.id}" 
           style="background: #6200EE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Task
        </a>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can adjust your notification preferences in your account settings.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `New Task: ${task.title}`,
      html
    });

  } catch (error) {
    console.error('Error sending task assigned email:', error);
    return false;
  }
}

 async sendCommentMentionEmail(userId: string, commentId: string, mentionedByUserId: string) {
  // Get the comment first to avoid circular reference
  const commentPromise = prisma.comment.findUnique({ 
    where: { id: commentId },
    select: {
      id: true,
      content: true,
      taskId: true
    }
  });

  // Get user data
  const userPromise = prisma.user.findUnique({ 
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  const mentionedByPromise = prisma.user.findUnique({ 
    where: { id: mentionedByUserId },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  const [comment, user, mentionedBy] = await Promise.all([
    commentPromise,
    userPromise,
    mentionedByPromise
  ]);

  if (!comment || !user || !mentionedBy) return false;

  // Now get the task using the comment's taskId
  const task = await prisma.task.findUnique({ 
    where: { id: comment.taskId },
    select: {
      id: true,
      title: true
    }
  });

  if (!task) return false;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6200EE;">You were mentioned in a comment</h2>
      <p>Hello ${user.name || user.email},</p>
      <p>${mentionedBy.name || mentionedBy.email} mentioned you in a comment on task "${task.title}":</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-style: italic;">"${comment.content}"</p>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks/${task.id}" 
         style="background: #6200EE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        View Comment
      </a>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        You can adjust your notification preferences in your account settings.
      </p>
    </div>
  `;

  return this.sendEmail({
    to: user.email,
    subject: `You were mentioned in a comment on "${task.title}"`,
    html
  });
}

  async sendProjectInviteEmail(userId: string, projectId: string, invitedByUserId: string) {
    const [user, project, invitedBy] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: invitedByUserId } })
    ]);

    if (!user || !project || !invitedBy) return false;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6200EE;">Project Invitation</h2>
        <p>Hello ${user.name || user.email},</p>
        <p>You have been invited to join the project "${project.name}" by ${invitedBy.name || invitedBy.email}:</p>
        
        ${project.description ? `
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">${project.description}</p>
        </div>
        ` : ''}
        
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${project.id}" 
           style="background: #6200EE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Project
        </a>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can adjust your notification preferences in your account settings.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Invitation to project: ${project.name}`,
      html
    });
  }
}

export const emailService = new EmailService();