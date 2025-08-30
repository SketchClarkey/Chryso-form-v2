import { useState, useRef, useCallback } from 'react';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useTheme,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  PhotoCamera,
  Edit,
  Compress,
  CloudOff,
} from '@mui/icons-material';
import { MobileCameraCapture } from '../camera/MobileCameraCapture';
import { PhotoAnnotationEditor } from '../camera/PhotoAnnotationEditor';
import { FilePreview } from './FilePreview';
import ImageOptimizationService from '../../services/imageOptimizationService';
import OfflineService from '../../services/offlineService';
import { useMobile } from '../../hooks/useMobile';
import { useToastNotifications } from '../notifications/NotificationToast';

export interface EnhancedFileAttachment {
  id: string;
  file: File;
  originalFile?: File;
  name: string;
  size: number;
  originalSize?: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error' | 'offline';
  url?: string;
  dataUrl?: string;
  error?: string;
  isOptimized?: boolean;
  compressionRatio?: number;
  annotations?: any[];
}

interface EnhancedFileUploaderProps {
  files: EnhancedFileAttachment[];
  onFilesChange: (files: EnhancedFileAttachment[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  showPreview?: boolean;
  enableCamera?: boolean;
  enableAnnotations?: boolean;
  autoOptimize?: boolean;
  offlineCapable?: boolean;
}

export function EnhancedFileUploader({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeBytes = 25 * 1024 * 1024, // 25MB
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
  showPreview = true,
  enableCamera = true,
  enableAnnotations = true,
  autoOptimize = true,
  offlineCapable = true,
}: EnhancedFileUploaderProps) {
  const theme = useTheme();
  const { isMobile, hasTouch } = useMobile();
  const toast = useToastNotifications();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [currentImageForAnnotation, setCurrentImageForAnnotation] = useState<string>('');
  const [currentFileForAnnotation, setCurrentFileForAnnotation] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationDialog, setOptimizationDialog] = useState(false);
  const [filesToOptimize, setFilesToOptimize] = useState<EnhancedFileAttachment[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const imageOptimizationService = ImageOptimizationService.getInstance();
  const offlineService = OfflineService.getInstance();

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const newFiles: EnhancedFileAttachment[] = [];
      const filesToProcess = Array.from(selectedFiles);

      if (files.length + filesToProcess.length > maxFiles) {
        toast.showError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      for (const file of filesToProcess) {
        if (file.size > maxSizeBytes) {
          toast.showError(`File ${file.name} exceeds maximum size`);
          continue;
        }

        const attachment: EnhancedFileAttachment = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          originalFile: file,
          name: file.name,
          size: file.size,
          originalSize: file.size,
          type: file.type,
          uploadProgress: 0,
          status: isOffline ? 'offline' : 'uploading',
          isOptimized: false,
          compressionRatio: 1,
        };

        // Create data URL for preview
        if (file.type.startsWith('image/')) {
          attachment.dataUrl = URL.createObjectURL(file);
        }

        newFiles.push(attachment);
      }

      // Check if images need optimization
      const imagesToOptimize = newFiles.filter(
        file =>
          file.file.type.startsWith('image/') &&
          autoOptimize &&
          imageOptimizationService.shouldCompress(file.file, isMobile ? 'mobile' : 'desktop')
      );

      if (imagesToOptimize.length > 0) {
        setFilesToOptimize(imagesToOptimize);
        setOptimizationDialog(true);
      } else {
        onFilesChange([...files, ...newFiles]);
        if (offlineCapable && isOffline) {
          await storeFilesOffline(newFiles);
        }
      }
    },
    [
      files,
      maxFiles,
      maxSizeBytes,
      autoOptimize,
      isMobile,
      isOffline,
      offlineCapable,
      onFilesChange,
      toast,
    ]
  );

  const handleOptimization = async (shouldOptimize: boolean) => {
    setOptimizationDialog(false);

    if (shouldOptimize) {
      setIsOptimizing(true);
      const optimizedFiles: EnhancedFileAttachment[] = [];

      for (const fileAttachment of filesToOptimize) {
        try {
          const settings = imageOptimizationService.getOptimalSettings(
            isMobile ? 'mobile' : 'desktop',
            'slow' // Assume slow connection for better optimization
          );

          const result = await imageOptimizationService.optimizeImage(
            fileAttachment.file,
            settings
          );

          const optimizedAttachment: EnhancedFileAttachment = {
            ...fileAttachment,
            file: new File([result.blob], fileAttachment.name, { type: result.blob.type }),
            size: result.blob.size,
            isOptimized: true,
            compressionRatio: result.metadata.compressionRatio,
            dataUrl: result.dataUrl,
          };

          optimizedFiles.push(optimizedAttachment);
          toast.showSuccess(
            `${fileAttachment.name} optimized (${Math.round((1 - result.metadata.compressedSize / result.metadata.originalSize) * 100)}% reduction)`
          );
        } catch (error) {
          console.error('Optimization failed:', error);
          optimizedFiles.push(fileAttachment);
        }
      }

      setIsOptimizing(false);
      onFilesChange([...files, ...optimizedFiles]);

      if (offlineCapable && isOffline) {
        await storeFilesOffline(optimizedFiles);
      }
    } else {
      onFilesChange([...files, ...filesToOptimize]);
      if (offlineCapable && isOffline) {
        await storeFilesOffline(filesToOptimize);
      }
    }

    setFilesToOptimize([]);
  };

  const storeFilesOffline = async (filesToStore: EnhancedFileAttachment[]) => {
    for (const fileAttachment of filesToStore) {
      try {
        await offlineService.storeAttachmentOffline(fileAttachment.id, fileAttachment.file, {
          name: fileAttachment.name,
          type: fileAttachment.type,
          uploadProgress: fileAttachment.uploadProgress,
          status: fileAttachment.status,
        });
      } catch (error) {
        console.error('Failed to store file offline:', error);
      }
    }
  };

  const handleCameraCapture = async (capturedMedia: any[]) => {
    const newFiles: EnhancedFileAttachment[] = [];

    for (const media of capturedMedia) {
      const attachment: EnhancedFileAttachment = {
        id: media.id,
        file: new File([media.blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }),
        name: `Photo ${new Date().toLocaleTimeString()}`,
        size: media.blob.size,
        type: 'image/jpeg',
        uploadProgress: 0,
        status: isOffline ? 'offline' : 'uploading',
        dataUrl: media.dataUrl,
        isOptimized: false,
      };

      newFiles.push(attachment);
    }

    onFilesChange([...files, ...newFiles]);

    if (offlineCapable && isOffline) {
      await storeFilesOffline(newFiles);
    }

    toast.showSuccess(`${newFiles.length} photo(s) captured`);
  };

  const handleAnnotationSave = (annotatedImageUrl: string, annotations: any[]) => {
    const fileIndex = files.findIndex(f => f.id === currentFileForAnnotation);
    if (fileIndex === -1) return;

    // Convert data URL to blob
    fetch(annotatedImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const updatedFiles = [...files];
        const updatedFile = {
          ...updatedFiles[fileIndex],
          file: new File([blob], updatedFiles[fileIndex].name, { type: 'image/jpeg' }),
          dataUrl: annotatedImageUrl,
          annotations,
          size: blob.size,
        };
        updatedFiles[fileIndex] = updatedFile;
        onFilesChange(updatedFiles);
        toast.showSuccess('Annotations saved to photo');
      });
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    onFilesChange(updatedFiles);
  };

  const optimizeFile = async (id: string) => {
    const fileIndex = files.findIndex(f => f.id === id);
    if (fileIndex === -1) return;

    const fileAttachment = files[fileIndex];
    if (!fileAttachment.file.type.startsWith('image/')) return;

    try {
      setIsOptimizing(true);
      const settings = imageOptimizationService.getOptimalSettings(
        isMobile ? 'mobile' : 'desktop',
        'slow'
      );

      const result = await imageOptimizationService.optimizeImage(
        fileAttachment.originalFile || fileAttachment.file,
        settings
      );

      const updatedFiles = [...files];
      updatedFiles[fileIndex] = {
        ...fileAttachment,
        file: new File([result.blob], fileAttachment.name, { type: result.blob.type }),
        size: result.blob.size,
        isOptimized: true,
        compressionRatio: result.metadata.compressionRatio,
        dataUrl: result.dataUrl,
      };

      onFilesChange(updatedFiles);
      toast.showSuccess(
        `Image optimized (${Math.round((1 - result.metadata.compressedSize / result.metadata.originalSize) * 100)}% reduction)`
      );
    } catch (error) {
      toast.showError('Failed to optimize image');
    } finally {
      setIsOptimizing(false);
    }
  };

  const annotateFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file || !file.dataUrl) return;

    setCurrentImageForAnnotation(file.dataUrl);
    setCurrentFileForAnnotation(id);
    setShowAnnotationEditor(true);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type === 'application/pdf') return <PdfIcon />;
    if (type.includes('document') || type.includes('word')) return <DocumentIcon />;
    return <FileIcon />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'offline':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        sx={{
          p: 3,
          border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
          backgroundColor: isDragging ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          mb: 2,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant='h6' gutterBottom>
          Drop files here or click to select
        </Typography>
        <Typography variant='body2' color='text.secondary' gutterBottom>
          Maximum {maxFiles} files, {formatFileSize(maxSizeBytes)} per file
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          <Button
            variant='outlined'
            startIcon={<UploadIcon />}
            onClick={e => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose Files
          </Button>

          {enableCamera && (isMobile || hasTouch) && (
            <Button
              variant='outlined'
              startIcon={<PhotoCamera />}
              onClick={e => {
                e.stopPropagation();
                setShowCamera(true);
              }}
            >
              Take Photo
            </Button>
          )}
        </Box>

        <input
          ref={fileInputRef}
          type='file'
          multiple
          accept={acceptedTypes.join(',')}
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files) {
              handleFileSelect(e.target.files);
            }
          }}
        />
      </Paper>

      {/* Offline Status */}
      {isOffline && offlineCapable && (
        <Alert severity='info' sx={{ mb: 2 }} icon={<CloudOff />}>
          You're offline. Files will be uploaded when connection is restored.
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>
              Attached Files ({files.length}/{maxFiles})
            </Typography>

            <List>
              {files.map(file => (
                <ListItem key={file.id} divider>
                  <ListItemIcon>{getFileIcon(file.type)}</ListItemIcon>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='subtitle2'>{file.name}</Typography>
                        {file.isOptimized && (
                          <Chip
                            label={`${Math.round((1 - 1 / file.compressionRatio!) * 100)}% smaller`}
                            size='small'
                            color='success'
                          />
                        )}
                        {file.status === 'offline' && (
                          <Chip label='Offline' size='small' color='warning' icon={<CloudOff />} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {formatFileSize(file.size)}
                          {file.originalSize && file.originalSize !== file.size && (
                            <> (was {formatFileSize(file.originalSize)})</>
                          )}
                        </Typography>
                        {file.uploadProgress > 0 && file.uploadProgress < 100 && (
                          <LinearProgress
                            variant='determinate'
                            value={file.uploadProgress}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {file.type.startsWith('image/') && !file.isOptimized && (
                        <IconButton
                          size='small'
                          onClick={() => optimizeFile(file.id)}
                          disabled={isOptimizing}
                          title='Optimize image'
                        >
                          <Compress />
                        </IconButton>
                      )}

                      {file.type.startsWith('image/') && enableAnnotations && (
                        <IconButton
                          size='small'
                          onClick={() => annotateFile(file.id)}
                          title='Annotate image'
                        >
                          <Edit />
                        </IconButton>
                      )}

                      <IconButton size='small' onClick={() => removeFile(file.id)} color='error'>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {showPreview && files.some(f => f.dataUrl) && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {files
            .filter(f => f.dataUrl)
            .map(file => (
              <Grid size={{ xs: 6 }} sm={4} md={3} key={file.id}>
                <FilePreview file={file as any} />
              </Grid>
            ))}
        </Grid>
      )}

      {/* Camera Capture Dialog */}
      {showCamera && (
        <MobileCameraCapture
          open={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
          maxPhotos={maxFiles - files.length}
          compressionQuality={0.8}
          maxResolution={isMobile ? 1280 : 1920}
        />
      )}

      {/* Photo Annotation Editor */}
      {showAnnotationEditor && (
        <PhotoAnnotationEditor
          open={showAnnotationEditor}
          imageUrl={currentImageForAnnotation}
          onClose={() => setShowAnnotationEditor(false)}
          onSave={handleAnnotationSave}
        />
      )}

      {/* Optimization Dialog */}
      <Dialog open={optimizationDialog} onClose={() => setOptimizationDialog(false)}>
        <DialogTitle>Optimize Images?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {filesToOptimize.length} image(s) can be optimized to reduce file size and improve
            upload speed.
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            This will compress images while maintaining good quality. You can always restore the
            original later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleOptimization(false)}>Skip Optimization</Button>
          <Button onClick={() => handleOptimization(true)} variant='contained' autoFocus>
            Optimize Images
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
