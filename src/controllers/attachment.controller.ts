import { Response } from 'express';
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

// ================ TYPE DEFINITIONS ================

interface UploadResult {
  success: boolean;
  file: string;
  error?: string;
}

interface UploadSummary {
  total: number;
  successful: number;
  failed: number;
  errors?: string[];
}

interface FormattedAttachment {
  id: string;
  filename: string;
  filepath: string;
  filetype: string;
  filesize: number;
  isPublic: boolean;
  taskId: string;
  userId: string;
  url: string; // Note: Will be empty string if null
  createdAt: Date;
  updatedAt: Date;
  formattedSize: string;
  downloadUrl: string;
  previewUrl: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  task?: {
    id: string;
    title: string;
  };
}

// Helper function to safely get URL or empty string
const getSafeUrl = (url: string | null): string => {
  return url || '';
};

// ================ HELPER FUNCTIONS ================

const uploadToSupabase = async (userId: string, file: Express.Multer.File) => {
  const fileExt = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Upload to Supabase
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(filePath);

  return { filePath, publicUrl, fileName };
};

const saveToDatabase = async (
  file: Express.Multer.File,
  userId: string,
  taskId: string,
  filePath: string,
  publicUrl: string,
  isPublic: boolean = false
) => {
  return await prisma.attachment.create({
    data: {
      filename: file.originalname,
      filepath: filePath,
      filetype: file.mimetype,
      filesize: Math.round(file.size),
      isPublic: isPublic,
      taskId: taskId,
      userId: userId,
      url: publicUrl
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
};

// ================ CONTROLLER FUNCTIONS ================

// 1. Upload Single Attachment
export const uploadSingleAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const file = req.file as Express.Multer.File;

    // Validate file
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Use field name "file" for single upload.'
      });
    }

    // Verify task exists
    const taskExists = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true }
    });

    if (!taskExists) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    console.log(`📤 SINGLE UPLOAD: ${file.originalname} for task ${taskId}`);

    // Upload to Supabase
    const { filePath, publicUrl } = await uploadToSupabase(userId, file);

    // Save to database
    const attachment = await saveToDatabase(
      file,
      userId,
      taskId,
      filePath,
      publicUrl,
      req.body.isPublic === 'true'
    );

    console.log('✅ Attachment saved:', attachment.id);

    // Format response
    const formattedAttachment: FormattedAttachment = {
      ...attachment,
      url: getSafeUrl(attachment.url), // Handle null URL
      formattedSize: formatFileSize(attachment.filesize),
      downloadUrl: `/api/attachments/${attachment.id}/download`,
      previewUrl: `/api/attachments/${attachment.id}/preview`
    };

    return res.status(201).json({
      status: 'success',
      data: {
        attachment: formattedAttachment
      }
    });

  } catch (error: any) {
    console.error('🔥 SINGLE UPLOAD ERROR:', error.message);
    console.error(error.stack);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upload file',
      code: error.code || 'UPLOAD_ERROR'
    });
  }
};

// 2. Upload Multiple Attachments
export const uploadMultipleAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const files = req.files as Express.Multer.File[];

    console.log('📤 MULTIPLE UPLOAD REQUEST:');
    console.log('👤 User:', userId);
    console.log('📋 Task:', taskId);
    console.log('📄 Files:', files?.length || 0);

    // Validate files
    if (!files || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded. Use field name "files" for multiple uploads.'
      });
    }

    // Verify task exists
    const taskExists = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true }
    });

    if (!taskExists) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    console.log(`✅ Task verified, uploading ${files.length} files...`);

    // Typed arrays
    const attachments: FormattedAttachment[] = [];
    const errors: string[] = [];
    const uploadResults: UploadResult[] = [];

    // Process files in parallel for better performance
    const uploadPromises = files.map(async (file, index) => {
      try {
        console.log(`📦 Processing file ${index + 1}/${files.length}: ${file.originalname}`);

        const { filePath, publicUrl } = await uploadToSupabase(userId, file);
        const attachment = await saveToDatabase(
          file,
          userId,
          taskId,
          filePath,
          publicUrl,
          req.body.isPublic === 'true'
        );

        // Format the attachment
        const formattedAttachment: FormattedAttachment = {
          ...attachment,
          url: getSafeUrl(attachment.url),
          formattedSize: formatFileSize(attachment.filesize),
          downloadUrl: `/api/attachments/${attachment.id}/download`,
          previewUrl: `/api/attachments/${attachment.id}/preview`
        };

        attachments.push(formattedAttachment);
        uploadResults.push({ success: true, file: file.originalname });

        console.log(`✅ File ${index + 1} uploaded: ${file.originalname}`);
        return formattedAttachment;
      } catch (error: any) {
        const errorMsg = `Failed to upload ${file.originalname}: ${error.message}`;
        errors.push(errorMsg);
        uploadResults.push({ 
          success: false, 
          file: file.originalname, 
          error: error.message 
        });
        console.error(`❌ ${errorMsg}`);
        return null;
      }
    });

    await Promise.all(uploadPromises);

    const successful = uploadResults.filter(r => r.success).length;
    const failed = uploadResults.filter(r => !r.success).length;

    const summary: UploadSummary = {
      total: files.length,
      successful,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`📊 Upload summary: ${successful} successful, ${failed} failed`);

    if (attachments.length === 0) {
      return res.status(500).json({
        status: 'error',
        message: 'All uploads failed',
        errors: errors
      });
    }

    return res.status(201).json({
      status: errors.length > 0 ? 'partial' : 'success',
      data: {
        attachments,
        summary
      }
    });

  } catch (error: any) {
    console.error('🔥 MULTIPLE UPLOAD ERROR:', error.message);
    console.error(error.stack);

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upload files',
      code: error.code || 'UPLOAD_ERROR'
    });
  }
};

// 3. Get All Attachments for a Task
export const getTaskAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params as TaskAttachmentsParams;
    
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted: FormattedAttachment[] = attachments.map(att => ({
      ...att,
      url: getSafeUrl(att.url),
      formattedSize: formatFileSize(att.filesize),
      downloadUrl: `/api/attachments/${att.id}/download`,
      previewUrl: `/api/attachments/${att.id}/preview`
    }));

    return res.json({
      status: 'success',
      data: formatted
    });
  } catch (error: any) {
    console.error('Get task attachments error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch attachments'
    });
  }
};

// 4. Get Single Attachment Details
export const getAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({
        status: 'error',
        message: 'Attachment not found'
      });
    }

    const formatted: FormattedAttachment = {
      ...attachment,
      url: getSafeUrl(attachment.url),
      formattedSize: formatFileSize(attachment.filesize),
      downloadUrl: `/api/attachments/${attachment.id}/download`,
      previewUrl: `/api/attachments/${attachment.id}/preview`
    };

    return res.json({
      status: 'success',
      data: formatted
    });
  } catch (error: any) {
    console.error('Get attachment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve attachment'
    });
  }
};

// 5. Download Attachment
export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({
        status: 'error',
        message: 'Attachment not found'
      });
    }

    if (!attachment.url) {
      return res.status(404).json({
        status: 'error',
        message: 'File URL not available'
      });
    }

    // Optional: Track download in analytics
    await prisma.attachment.update({
      where: { id },
      data: {
        // You could add a downloadCount field in your schema
        // downloadCount: { increment: 1 }
      }
    });

    // Redirect to Supabase URL
    return res.redirect(attachment.url);
  } catch (error: any) {
    console.error('Download error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Download failed'
    });
  }
};

// 6. Preview Attachment
export const previewAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({
        status: 'error',
        message: 'Attachment not found'
      });
    }

    if (!attachment.url) {
      return res.status(404).json({
        status: 'error',
        message: 'File URL not available'
      });
    }

    // For preview, we might want to handle different file types differently
    // For now, just redirect to the URL
    return res.redirect(attachment.url);
  } catch (error: any) {
    console.error('Preview error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Preview failed'
    });
  }
};

// 7. Delete Attachment
export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    const userId = req.user!.userId;
    
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({
        status: 'error',
        message: 'Attachment not found'
      });
    }

    // Check permission (use any user property that exists in your auth middleware)
    // Assuming you have role or isAdmin in your user object
    const userRole = (req.user as any)?.role || (req.user as any)?.isAdmin || false;
    
    if (attachment.userId !== userId && !userRole) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this attachment'
      });
    }

    // Delete from Supabase
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.filepath]);

    if (storageError) {
      console.error('Supabase delete error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id }
    });

    console.log(`🗑️ Attachment deleted: ${id}`);

    return res.json({
      status: 'success',
      message: 'Attachment deleted successfully',
      data: {
        deletedId: id,
        filename: attachment.filename
      }
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete attachment'
    });
  }
};

// 8. Get User's Attachments
export const getUserAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const attachments = await prisma.attachment.findMany({
      where: { userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted: FormattedAttachment[] = attachments.map(att => ({
      ...att,
      url: getSafeUrl(att.url),
      formattedSize: formatFileSize(att.filesize),
      downloadUrl: `/api/attachments/${att.id}/download`,
      previewUrl: `/api/attachments/${att.id}/preview`
    }));

    return res.json({
      status: 'success',
      data: formatted
    });
  } catch (error: any) {
    console.error('Get user attachments error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user attachments'
    });
  }
};

// 9. Update Attachment (Metadata only)
export const updateAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    const userId = req.user!.userId;
    const { filename, isPublic } = req.body;

    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({
        status: 'error',
        message: 'Attachment not found'
      });
    }

    // Check permission
    const userRole = (req.user as any)?.role || (req.user as any)?.isAdmin || false;
    
    if (attachment.userId !== userId && !userRole) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this attachment'
      });
    }

    // Only update metadata, not the actual file
    const updated = await prisma.attachment.update({
      where: { id },
      data: {
        filename: filename || attachment.filename,
        isPublic: isPublic !== undefined ? isPublic : attachment.isPublic
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true // <-- ADD THIS LINE
          }
        }
      }
    });

    // Format response
    const formatted: FormattedAttachment = {
      ...updated,
      url: getSafeUrl(updated.url),
      formattedSize: formatFileSize(updated.filesize),
      downloadUrl: `/api/attachments/${updated.id}/download`,
      previewUrl: `/api/attachments/${updated.id}/preview`
    };

    return res.json({
      status: 'success',
      data: formatted
    });
  } catch (error: any) {
    console.error('Update error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update attachment'
    });
  }
};

// ... rest of the code below remains the same ...

// 10. Check Attachment Exists
export const checkAttachmentExists = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as AttachmentIdParams;
    
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        filetype: true,
        filesize: true,
        createdAt: true,
        url: true
      }
    });

    if (!attachment) {
      return res.status(404).json({
        status: 'error',
        message: 'Attachment not found',
        exists: false
      });
    }

    return res.json({
      status: 'success',
      data: {
        ...attachment,
        url: getSafeUrl(attachment.url),
        exists: true,
        formattedSize: formatFileSize(attachment.filesize)
      }
    });
  } catch (error: any) {
    console.error('Check attachment error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check attachment'
    });
  }
};