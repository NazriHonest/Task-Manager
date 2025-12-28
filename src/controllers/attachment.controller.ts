import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  UploadAttachmentInput,
  AttachmentIdParams,
  TaskAttachmentsParams
} from '../validators/attachment.validator';
import { formatFileSize } from '../middleware/upload.middleware';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// 1. Get All Attachments for a Task
export const getTaskAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params as TaskAttachmentsParams;
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = attachments.map(att => ({
      ...att,
      formattedSize: formatFileSize(att.filesize),
      downloadUrl: att.url || `/api/attachments/${att.id}/download`
    }));

    return res.json({ status: 'success', data: formatted });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fetch failed' });
  }
};

// 2. Get Single Attachment Details
export const getAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    const attachment = await prisma.attachment.findUnique({ 
      where: { id },
      include: { user: { select: { id: true, name: true } } }
    });
    if (!attachment) return res.status(404).json({ message: 'Not found' });
    return res.json({ status: 'success', data: attachment });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving attachment' });
  }
};

// 3. Upload Attachment (Supabase Logic)
// attachment.controller.ts

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No files uploaded' });
    }

    // IMPORTANT: Verify the Task exists before trying to attach files
    const taskExists = await prisma.task.findUnique({ where: { id: taskId } });
    if (!taskExists) {
      console.error(`Task ${taskId} not found in database.`);
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    const attachments = [];

    for (const file of files) {
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1. Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      // 2. Save to Database
      // We use Math.round to ensure filesize is a clean integer for Prisma
      const newAttachment = await prisma.attachment.create({
        data: {
          filename: file.originalname,
          filepath: filePath,
          filetype: file.mimetype,
          filesize: Math.round(file.size), 
          isPublic: String(req.body.isPublic) === 'true',
          taskId: taskId, // Ensure this is the UUID string
          userId: userId,
          url: publicUrl 
        }
      });
      attachments.push(newAttachment);
    }

    return res.status(201).json({ status: 'success', data: { attachments } });
  } catch (error: any) {
    console.error('DATABASE OR STORAGE ERROR:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Server failed to process file' 
    });
  }
};

// 4. Download & Preview (Redirect to Supabase)
export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return res.status(404).json({ message: 'Not found' });
    return res.redirect(attachment.url || ''); 
  } catch (error) {
    return res.status(500).json({ message: 'Download error' });
  }
};

// Alias for preview (Matches your route export)
export const previewAttachment = downloadAttachment;

// 5. Delete Logic
export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return res.status(404).json({ message: 'Not found' });

    await supabase.storage.from('attachments').remove([attachment.filepath]);
    await prisma.attachment.delete({ where: { id } });

    return res.status(200).json({ status: 'success', message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Delete error' });
  }
};

// 6. Missing User Attachments & Update
export const getUserAttachments = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const data = await prisma.attachment.findMany({ where: { userId } });
  return res.json({ status: 'success', data });
};

export const updateAttachment = async (req: AuthRequest, res: Response) => {
  return res.status(501).json({ message: 'Update not implemented for cloud storage' });
};