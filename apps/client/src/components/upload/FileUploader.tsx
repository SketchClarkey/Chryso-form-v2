import { useState, useRef, useCallback } from 'react';
import { FilePreview } from './FilePreview';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Paper,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

interface FileUploaderProps {
  files: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  showPreview?: boolean;
}

const ACCEPTED_TYPES = {
  'image/*': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
};

const DEFAULT_ACCEPTED_TYPES = Object.keys(ACCEPTED_TYPES);
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;

export function FileUploader({
  files,
  onFilesChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  showPreview = true,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon color='primary' />;
    if (type === 'application/pdf') return <PdfIcon color='error' />;
    if (type.includes('word') || type.includes('document')) return <DocumentIcon color='info' />;
    return <FileIcon />;
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${formatFileSize(maxSizeBytes)} limit`;
    }

    // Check file type
    const isTypeAccepted = acceptedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type;
    });

    if (!isTypeAccepted) {
      return `File type ${file.type} is not supported`;
    }

    // Check if file already exists
    if (files.some(f => f.name === file.name && f.size === file.size)) {
      return `File "${file.name}" already exists`;
    }

    return null;
  };

  const uploadFile = async (fileAttachment: FileAttachment): Promise<void> => {
    const formData = new FormData();
    formData.append('file', fileAttachment.file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          const updatedFile: FileAttachment = {
            ...fileAttachment,
            uploadProgress: progress,
          };

          onFilesChange(files.map(f => (f.id === fileAttachment.id ? updatedFile : f)));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            const updatedFile: FileAttachment = {
              ...fileAttachment,
              uploadProgress: 100,
              status: 'completed',
              url: result.data.file.url,
            };

            onFilesChange(files.map(f => (f.id === fileAttachment.id ? updatedFile : f)));
            resolve();
          } catch (parseError) {
            const updatedFile: FileAttachment = {
              ...fileAttachment,
              uploadProgress: 0,
              status: 'error',
              error: 'Failed to parse server response',
            };

            onFilesChange(files.map(f => (f.id === fileAttachment.id ? updatedFile : f)));
            reject(new Error('Failed to parse server response'));
          }
        } else {
          let errorMessage = 'Upload failed';
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Use default error message
          }

          const updatedFile: FileAttachment = {
            ...fileAttachment,
            uploadProgress: 0,
            status: 'error',
            error: errorMessage,
          };

          onFilesChange(files.map(f => (f.id === fileAttachment.id ? updatedFile : f)));
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        const updatedFile: FileAttachment = {
          ...fileAttachment,
          uploadProgress: 0,
          status: 'error',
          error: 'Network error during upload',
        };

        onFilesChange(files.map(f => (f.id === fileAttachment.id ? updatedFile : f)));
        reject(new Error('Network error during upload'));
      });

      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      xhr.open('POST', '/api/uploads/single');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: FileAttachment[] = [];
      const errors: string[] = [];

      // Check max files limit
      if (files.length + fileList.length > maxFiles) {
        errors.push(`Cannot upload more than ${maxFiles} files`);
        return;
      }

      Array.from(fileList).forEach(file => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
          return;
        }

        const fileAttachment: FileAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadProgress: 0,
          status: 'uploading',
        };

        newFiles.push(fileAttachment);
      });

      if (errors.length > 0) {
        console.error('File validation errors:', errors);
        // You could show these errors in a snackbar or alert
        return;
      }

      // Add new files to the list
      const updatedFiles = [...files, ...newFiles];
      onFilesChange(updatedFiles);

      // Start uploading new files
      newFiles.forEach(fileAttachment => {
        uploadFile(fileAttachment).catch(console.error);
      });
    },
    [files, maxFiles, maxSizeBytes, acceptedTypes, onFilesChange]
  );

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      handleFiles(fileList);
    }
    // Reset input value to allow same file to be selected again
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const fileList = event.dataTransfer.files;
    if (fileList && fileList.length > 0) {
      handleFiles(fileList);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.status === 'error') {
      const updatedFile: FileAttachment = {
        ...file,
        status: 'uploading',
        uploadProgress: 0,
        error: undefined,
      };

      onFilesChange(files.map(f => (f.id === fileId ? updatedFile : f)));

      uploadFile(updatedFile).catch(console.error);
    }
  };

  const canUploadMore = files.length < maxFiles;

  return (
    <Box>
      {/* Upload Area */}
      {canUploadMore && (
        <Paper
          sx={{
            p: 3,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragOver ? 'primary.main' : 'grey.300',
            backgroundColor: isDragOver ? 'action.hover' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
            },
            mb: files.length > 0 ? 2 : 0,
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant='h6' gutterBottom>
            Drop files here or click to upload
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Maximum {maxFiles} files, up to {formatFileSize(maxSizeBytes)} each
          </Typography>
          <Button variant='outlined' startIcon={<UploadIcon />}>
            Choose Files
          </Button>
        </Paper>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type='file'
        multiple
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant='subtitle1'>
                Attached Files ({files.length}/{maxFiles})
              </Typography>
              {canUploadMore && (
                <Button size='small' startIcon={<UploadIcon />} onClick={handleFileSelect}>
                  Add More
                </Button>
              )}
            </Box>

            <List>
              {files.map(file => (
                <ListItem key={file.id} divider>
                  <ListItemIcon>
                    {file.status === 'completed' && <SuccessIcon color='success' />}
                    {file.status === 'error' && <WarningIcon color='error' />}
                    {file.status === 'uploading' && getFileIcon(file.type)}
                    {file.status === 'completed' && getFileIcon(file.type)}
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='body1'>{file.name}</Typography>
                        <Chip
                          label={file.status}
                          size='small'
                          color={
                            file.status === 'completed'
                              ? 'success'
                              : file.status === 'error'
                                ? 'error'
                                : 'primary'
                          }
                          variant='outlined'
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {formatFileSize(file.size)}
                        </Typography>
                        {file.status === 'uploading' && (
                          <LinearProgress
                            variant='determinate'
                            value={file.uploadProgress}
                            sx={{ mt: 1, maxWidth: 200 }}
                          />
                        )}
                        {file.status === 'error' && file.error && (
                          <Alert severity='error' sx={{ mt: 1 }}>
                            {file.error}
                            <Button
                              size='small'
                              onClick={() => retryUpload(file.id)}
                              sx={{ ml: 1 }}
                            >
                              Retry
                            </Button>
                          </Alert>
                        )}
                        {file.status === 'completed' && file.url && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button size='small' onClick={() => setPreviewFile(file)}>
                              Preview
                            </Button>
                            <Button size='small' href={file.url} download={file.name}>
                              Download
                            </Button>
                          </Box>
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      edge='end'
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Information */}
      <Typography variant='caption' display='block' sx={{ mt: 1, color: 'text.secondary' }}>
        Supported file types: Images, PDF, Word documents, Excel sheets, Text files
      </Typography>

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </Box>
  );
}
