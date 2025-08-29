import { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Card,
  CardMedia,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { FileAttachment } from './FileUploader';

interface FilePreviewProps {
  file: FileAttachment;
  open: boolean;
  onClose: () => void;
}

export function FilePreview({ file, open, onClose }: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type.startsWith('text/');

  const renderPreviewContent = () => {
    if (file.status !== 'completed' || !file.url) {
      return (
        <Typography>
          File is not ready for preview.
        </Typography>
      );
    }

    if (isImage && !imageError) {
      return (
        <Card sx={{ maxWidth: '100%', maxHeight: '70vh' }}>
          <CardMedia
            component="img"
            src={file.url}
            alt={file.name}
            onError={() => setImageError(true)}
            sx={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
            }}
          />
        </Card>
      );
    }

    if (isPdf) {
      return (
        <Box sx={{ width: '100%', height: '70vh' }}>
          <embed
            src={file.url}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        </Box>
      );
    }

    if (isText && file.size < 1024 * 1024) { // Only preview text files under 1MB
      return (
        <Box sx={{ 
          height: '70vh', 
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 2,
        }}>
          <iframe
            src={file.url}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={file.name}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" gutterBottom>
          Preview not available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This file type cannot be previewed in the browser.
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          href={file.url}
          download={file.name}
        >
          Download File
        </Button>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" component="span">
            {file.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            {Math.round(file.size / 1024)} KB
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
        {renderPreviewContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        {file.status === 'completed' && file.url && (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            href={file.url}
            download={file.name}
          >
            Download
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}