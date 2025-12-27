import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  UploadAttachmentInput,
  UpdateAttachmentInput,
  AttachmentIdParams,
  TaskAttachmentsParams
} from '../validators/attachment.validator';
import { formatFileSize } from '../middleware/upload.middleware';
import { supabase } from '../lib/supabase'; // Make sure this path is correct
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// 1. UPDATE: Upload Attachment
export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params as TaskAttachmentsParams;
    const body = req.body as UploadAttachmentInput;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No files uploaded' });
    }

    // Check task access (Keeping your original logic)
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [{ userId }, { project: { members: { some: { userId } } } }]
      }
    });

    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    // Create attachments by uploading to Supabase
    const attachments = await Promise.all(
      files.map(async (file) => {
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Upload Buffer to Supabase
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        return await prisma.attachment.create({
          data: {
            filename: file.originalname,
            filepath: filePath, // Store the Supabase Path here
            filetype: file.mimetype,
            filesize: file.size,
            isPublic: body.isPublic || false,
            taskId,
            userId,
            commentId: body.commentId,
            url: publicUrl // Ensure your Prisma schema has a 'url' field!
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        });
      })
    );

    const formattedAttachments = attachments.map(att => ({
      ...att,
      formattedSize: formatFileSize(att.filesize),
      // NEW: Direct Cloud URL instead of a broken local route
      downloadUrl: (att as any).url || `/api/attachments/${att.id}/download` 
    }));

    return res.status(201).json({
      status: 'success',
      data: { attachments: formattedAttachments }
    });

  } catch (error) {
    console.error('Upload attachment error:', error);
    return res.status(500).json({ status: 'error', message: 'Upload failed' });
  }
};

// 2. UPDATE: Download/Preview Logic
// Since files are now Public on Supabase, your frontend can use 'attachment.url' directly.
// But if you want to keep the download route for security/logging:
export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    const attachment = await prisma.attachment.findUnique({ where: { id } });

    if (!attachment) return res.status(404).json({ message: 'Not found' });

    // Simply redirect to the Supabase URL
    // This offloads the bandwidth from Render to Supabase (faster + free)
    const { data } = supabase.storage.from('attachments').getPublicUrl(attachment.filepath);
    return res.redirect(data.publicUrl);
    
  } catch (error) {
    return res.status(500).json({ message: 'Download error' });
  }
};

// 3. UPDATE: Delete Logic
export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as AttachmentIdParams;

    const attachment = await prisma.attachment.findUnique({ where: { id } });

    if (!attachment) return res.status(404).json({ message: 'Not found' });

    // Delete from Supabase Cloud
    await supabase.storage.from('attachments').remove([attachment.filepath]);

    // Delete from Database
    await prisma.attachment.delete({ where: { id } });

    return res.status(200).json({ status: 'success', message: 'Deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Delete error' });
  }
};