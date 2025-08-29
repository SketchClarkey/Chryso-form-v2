import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import {
  uploadMultiple,
  uploadSingle,
  handleUploadError,
  getFileInfo,
} from '../middleware/upload.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload single file
router.post(
  '/single',
  uploadSingle,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
          code: 'NO_FILE',
        });
        return;
      }

      const fileInfo = getFileInfo(req.file);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: { file: fileInfo },
      });
    } catch (error) {
      console.error('Single file upload error:', error);
      res.status(500).json({
        success: false,
        message: 'File upload failed',
        code: 'UPLOAD_ERROR',
      });
    }
  }
);

// Upload multiple files
router.post(
  '/multiple',
  uploadMultiple,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded',
          code: 'NO_FILES',
        });
        return;
      }

      const filesInfo = files.map(getFileInfo);

      res.json({
        success: true,
        message: `${files.length} files uploaded successfully`,
        data: { files: filesInfo },
      });
    } catch (error) {
      console.error('Multiple files upload error:', error);
      res.status(500).json({
        success: false,
        message: 'File upload failed',
        code: 'UPLOAD_ERROR',
      });
    }
  }
);

// Serve uploaded files
router.get('/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent path traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename',
        code: 'INVALID_FILENAME',
      });
      return;
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Get file stats for content length
      const stats = await fs.stat(filePath);

      // Set appropriate headers
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      // Stream the file
      res.sendFile(filePath);
    } catch (fileError) {
      res.status(404).json({
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving file',
      code: 'FILE_SERVE_ERROR',
    });
  }
});

// Delete a file
router.delete('/:filename', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename',
        code: 'INVALID_FILENAME',
      });
      return;
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);

    try {
      // Delete the file
      await fs.unlink(filePath);

      res.json({
        success: true,
        message: 'File deleted successfully',
        data: { filename },
      });
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        res.status(404).json({
          success: false,
          message: 'File not found',
          code: 'FILE_NOT_FOUND',
        });
      } else {
        throw fileError;
      }
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      code: 'FILE_DELETE_ERROR',
    });
  }
});

// Get file information
router.get('/info/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename',
        code: 'INVALID_FILENAME',
      });
      return;
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);

    try {
      const stats = await fs.stat(filePath);

      res.json({
        success: true,
        data: {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          url: `/api/uploads/${filename}`,
        },
      });
    } catch (fileError) {
      res.status(404).json({
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting file info',
      code: 'FILE_INFO_ERROR',
    });
  }
});

// Error handler for upload errors
router.use(handleUploadError);

export default router;
