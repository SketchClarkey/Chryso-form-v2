import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Chip,
  Paper,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  PhotoCamera,
  Close,
  FlipCameraAndroid,
  FlashOn,
  FlashOff,
  FlashAuto,
  GridOn,
  GridOff,
  Brightness6,
  ZoomIn,
  ZoomOut,
  CameraAlt,
  Videocam,
  Check,
  Refresh,
} from '@mui/icons-material';
import { useMobileBehavior } from '../../hooks/useMobile';
import { useToastNotifications } from '../notifications/NotificationToast';

interface CapturedMedia {
  id: string;
  blob: Blob;
  dataUrl: string;
  type: 'photo' | 'video';
  timestamp: number;
  metadata: {
    width: number;
    height: number;
    size: number;
    deviceOrientation: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

interface MobileCameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (media: CapturedMedia[]) => void;
  maxPhotos?: number;
  allowVideo?: boolean;
  compressionQuality?: number;
  maxResolution?: number;
}

export function MobileCameraCapture({
  open,
  onClose,
  onCapture,
  maxPhotos = 5,
  allowVideo = false,
  compressionQuality = 0.8,
  maxResolution = 1920,
}: MobileCameraCaptureProps) {
  const theme = useTheme();
  const { vibrate } = useMobileBehavior();
  const toast = useToastNotifications();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('environment');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera when dialog opens
  useEffect(() => {
    if (open) {
      initializeCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [open, currentCamera]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  }, []);

  const initializeCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: allowVideo && captureMode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }

      // Apply flash/torch if supported
      if (stream.getVideoTracks().length > 0) {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch && flashMode === 'on') {
          await track.applyConstraints({
            advanced: [{ torch: true }] as any
          });
        }
      }

    } catch (error) {
      console.error('Camera initialization failed:', error);
      toast.showError('Failed to access camera. Please check permissions.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    setIsProcessing(true);
    vibrate([50, 100, 50]); // Camera shutter vibration

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;

      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Apply filters and effects
      context.filter = `brightness(${brightness}%)`;
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob with compression
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', compressionQuality);
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      // Compress if needed
      const compressedBlob = await compressImage(blob, maxResolution);
      const dataUrl = canvas.toDataURL('image/jpeg', compressionQuality);

      // Get location if available
      const location = await getCurrentLocation().catch(() => undefined);

      const capturedPhoto: CapturedMedia = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blob: compressedBlob,
        dataUrl,
        type: 'photo',
        timestamp: Date.now(),
        metadata: {
          width: canvas.width,
          height: canvas.height,
          size: compressedBlob.size,
          deviceOrientation: screen.orientation?.type || 'unknown',
          location,
        },
      };

      setCapturedMedia(prev => [...prev, capturedPhoto]);
      toast.showSuccess('Photo captured');

    } catch (error) {
      console.error('Photo capture failed:', error);
      toast.showError('Failed to capture photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const startVideoRecording = async () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const dataUrl = URL.createObjectURL(blob);

        const location = await getCurrentLocation().catch(() => undefined);

        const capturedVideo: CapturedMedia = {
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          blob,
          dataUrl,
          type: 'video',
          timestamp: Date.now(),
          metadata: {
            width: streamRef.current?.getVideoTracks()[0]?.getSettings()?.width || 0,
            height: streamRef.current?.getVideoTracks()[0]?.getSettings()?.height || 0,
            size: blob.size,
            deviceOrientation: screen.orientation?.type || 'unknown',
            location,
          },
        };

        setCapturedMedia(prev => [...prev, capturedVideo]);
        toast.showSuccess('Video recorded');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      vibrate(100);

    } catch (error) {
      console.error('Video recording failed:', error);
      toast.showError('Failed to start recording');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      vibrate([100, 50, 100]);
    }
  };

  const compressImage = async (blob: Blob, maxResolution: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        const maxDimension = Math.max(width, height);
        
        if (maxDimension > maxResolution) {
          const ratio = maxResolution / maxDimension;
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((compressedBlob) => {
          resolve(compressedBlob || blob);
        }, 'image/jpeg', compressionQuality);
      };

      img.src = URL.createObjectURL(blob);
    });
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        reject,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const switchCamera = async () => {
    setCurrentCamera(prev => prev === 'user' ? 'environment' : 'user');
    vibrate(50);
  };

  const toggleFlash = async () => {
    const modes: typeof flashMode[] = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setFlashMode(nextMode);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track?.getCapabilities().torch) {
        await track.applyConstraints({
          advanced: [{ torch: nextMode === 'on' }] as any
        });
      }
    }
    vibrate(50);
  };

  const removePhoto = (id: string) => {
    setCapturedMedia(prev => prev.filter(media => media.id !== id));
    vibrate(50);
  };

  const handleFinish = () => {
    onCapture(capturedMedia);
    setCapturedMedia([]);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const FlashIcon = flashMode === 'on' ? FlashOn : flashMode === 'auto' ? FlashAuto : FlashOff;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          background: '#000',
          color: 'white',
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Video Stream */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${zoom})`,
              filter: `brightness(${brightness}%)`,
            }}
          />

          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {/* Grid Overlay */}
          {showGrid && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                background: `
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 33.33%,
                    rgba(255,255,255,0.3) 33.33%,
                    rgba(255,255,255,0.3) 33.63%
                  ),
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 33.33%,
                    rgba(255,255,255,0.3) 33.33%,
                    rgba(255,255,255,0.3) 33.63%
                  )
                `,
              }}
            />
          )}

          {/* Top Controls */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={toggleFlash} sx={{ color: 'white' }}>
                <FlashIcon />
              </IconButton>
              
              <IconButton
                onClick={() => setShowGrid(!showGrid)}
                sx={{ color: showGrid ? theme.palette.primary.main : 'white' }}
              >
                {showGrid ? <GridOn /> : <GridOff />}
              </IconButton>
            </Box>
          </Box>

          {/* Recording Indicator */}
          {isRecording && (
            <Paper
              sx={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                px: 2,
                py: 1,
                background: 'rgba(255, 0, 0, 0.8)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 1s infinite',
                }}
              />
              <Typography variant="caption">
                REC {formatTime(recordingTime)}
              </Typography>
            </Paper>
          )}

          {/* Side Controls */}
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Zoom Control */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <IconButton size="small" onClick={() => setZoom(Math.min(3, zoom + 0.2))}>
                <ZoomIn sx={{ color: 'white', fontSize: 20 }} />
              </IconButton>
              <Slider
                orientation="vertical"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(_, value) => setZoom(value as number)}
                sx={{ height: 80, color: 'white' }}
                size="small"
              />
              <IconButton size="small" onClick={() => setZoom(Math.max(1, zoom - 0.2))}>
                <ZoomOut sx={{ color: 'white', fontSize: 20 }} />
              </IconButton>
            </Box>

            {/* Brightness Control */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Brightness6 sx={{ color: 'white', fontSize: 20, mb: 1 }} />
              <Slider
                orientation="vertical"
                value={brightness}
                min={50}
                max={150}
                onChange={(_, value) => setBrightness(value as number)}
                sx={{ height: 80, color: 'white' }}
                size="small"
              />
            </Box>
          </Box>

          {/* Bottom Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
            }}
          >
            {/* Mode Selector */}
            {allowVideo && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <ToggleButtonGroup
                  value={captureMode}
                  exclusive
                  onChange={(_, value) => value && setCaptureMode(value)}
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                    },
                  }}
                >
                  <ToggleButton value="photo" size="small">
                    <CameraAlt sx={{ mr: 1 }} />
                    Photo
                  </ToggleButton>
                  <ToggleButton value="video" size="small">
                    <Videocam sx={{ mr: 1 }} />
                    Video
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Main Controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {/* Captured Media Count */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {capturedMedia.length > 0 && (
                  <Chip
                    label={`${capturedMedia.length}/${maxPhotos}`}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>

              {/* Capture Button */}
              <Box sx={{ position: 'relative' }}>
                {isProcessing ? (
                  <CircularProgress sx={{ color: 'white' }} />
                ) : (
                  <Fab
                    color={isRecording ? 'error' : 'primary'}
                    size="large"
                    onClick={
                      captureMode === 'photo'
                        ? capturePhoto
                        : isRecording
                        ? stopVideoRecording
                        : startVideoRecording
                    }
                    disabled={
                      !isStreaming ||
                      (captureMode === 'photo' && capturedMedia.length >= maxPhotos)
                    }
                    sx={{
                      width: 80,
                      height: 80,
                      border: '4px solid white',
                      animation: isRecording ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    {captureMode === 'photo' ? (
                      <PhotoCamera sx={{ fontSize: 32 }} />
                    ) : isRecording ? (
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          background: 'white',
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <Videocam sx={{ fontSize: 32 }} />
                    )}
                  </Fab>
                )}
              </Box>

              {/* Switch Camera / Finish */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <IconButton onClick={switchCamera} sx={{ color: 'white' }}>
                  <FlipCameraAndroid />
                </IconButton>
                
                {capturedMedia.length > 0 && (
                  <IconButton
                    onClick={handleFinish}
                    sx={{
                      color: theme.palette.success.main,
                      background: alpha(theme.palette.success.main, 0.1),
                    }}
                  >
                    <Check />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}