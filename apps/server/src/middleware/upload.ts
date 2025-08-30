import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // In production, this should be an AWS S3 bucket or similar
    const uploadPath = path.join(process.cwd(), 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid conflicts
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const filename = `${baseName}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

// File filter to validate file types
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`));
  }
};

// Create multer instance with configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 10, // Maximum 10 files per upload
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for multiple file upload
export const uploadMultiple = upload.array('files', 10);

// Error handler for multer errors
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 25MB.',
        code: 'FILE_TOO_LARGE',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.',
        code: 'TOO_MANY_FILES',
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.',
        code: 'UNEXPECTED_FILE',
      });
    }
  }

  if (error.message.includes('not supported')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'File upload failed.',
    code: 'UPLOAD_ERROR',
    details: error.message,
  });
};

// Utility function to get file URL
export const getFileUrl = (filename: string): string => {
  // In production, this would return the full URL from your CDN/S3 bucket
  return `/api/uploads/${filename}`;
};

// Utility function to validate file size
export const validateFileSize = (size: number, maxSize: number = 25 * 1024 * 1024): boolean => {
  return size <= maxSize;
};

// Utility function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimetype,
    url: getFileUrl(file.filename),
    uploadDate: new Date().toISOString(),
  };
};
