import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Paper,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
  useTheme,
  alpha,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Close,
  Undo,
  Redo,
  Save,
  Edit,
  TextFields,
  Crop,
  Brightness4,
  Contrast,
  Palette,
  ArrowForward,
  RadioButtonUnchecked,
  CropFree,
  FormatColorFill,
  Brush,
  ColorLens,
  Add,
  Remove,
} from '@mui/icons-material';
import { useMobileBehavior } from '../../hooks/useMobile';
import { useToastNotifications } from '../notifications/NotificationToast';

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text' | 'freehand';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  points?: Array<{ x: number; y: number }>;
}

interface PhotoAnnotationEditorProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (annotatedImageUrl: string, annotations: Annotation[]) => void;
  readOnly?: boolean;
}

export function PhotoAnnotationEditor({
  open,
  imageUrl,
  onClose,
  onSave,
  readOnly = false,
}: PhotoAnnotationEditorProps) {
  const theme = useTheme();
  const { vibrate } = useMobileBehavior();
  const toast = useToastNotifications();

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<Annotation['type']>('arrow');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);

  // Image adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const colors = [
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#FFA500',
    '#800080',
  ];

  useEffect(() => {
    if (open && imageUrl) {
      loadImage();
    }
  }, [open, imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [annotations, brightness, contrast, imageLoaded]);

  const loadImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (imageRef.current && canvasRef.current) {
        imageRef.current = img;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        setImageLoaded(true);
        redrawCanvas();
      }
    };
    img.src = imageUrl;
  };

  const redrawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0);

    // Reset filters for annotations
    ctx.filter = 'none';

    // Draw all annotations
    annotations.forEach(annotation => drawAnnotation(ctx, annotation));
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = annotation.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (annotation.type) {
      case 'arrow':
        drawArrow(ctx, annotation);
        break;
      case 'circle':
        drawCircle(ctx, annotation);
        break;
      case 'rectangle':
        drawRectangle(ctx, annotation);
        break;
      case 'text':
        drawText(ctx, annotation);
        break;
      case 'freehand':
        drawFreehand(ctx, annotation);
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { x, y, width = 0, height = 0 } = annotation;
    const endX = x + width;
    const endY = y + height;

    // Arrow line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrow head
    const angle = Math.atan2(height, width);
    const headLength = 20;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { x, y, width = 0, height = 0 } = annotation;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawRectangle = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { x, y, width = 0, height = 0 } = annotation;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
  };

  const drawText = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    if (!annotation.text) return;

    ctx.font = `${annotation.strokeWidth * 6}px Arial`;
    ctx.fillStyle = annotation.color;

    // Draw background for better readability
    const metrics = ctx.measureText(annotation.text);
    const textHeight = annotation.strokeWidth * 6;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(
      annotation.x - 4,
      annotation.y - textHeight - 4,
      metrics.width + 8,
      textHeight + 8
    );

    ctx.fillStyle = annotation.color;
    ctx.fillText(annotation.text, annotation.x, annotation.y);
  };

  const drawFreehand = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    if (!annotation.points || annotation.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(annotation.points[0].x, annotation.points[0].y);

    for (let i = 1; i < annotation.points.length; i++) {
      ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
    }

    ctx.stroke();
  };

  const getCanvasCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0]?.clientX || event.changedTouches[0]?.clientX || 0;
      clientY = event.touches[0]?.clientY || event.changedTouches[0]?.clientY || 0;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;

    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);

    if (currentTool === 'text') {
      setTextPosition({ x, y });
      setShowTextDialog(true);
      return;
    }

    setIsDrawing(true);
    vibrate(50);

    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: currentTool,
      x,
      y,
      width: 0,
      height: 0,
      color: currentColor,
      strokeWidth,
      points: currentTool === 'freehand' ? [{ x, y }] : undefined,
    };

    setCurrentAnnotation(newAnnotation);
  };

  const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);

    if (currentAnnotation.type === 'freehand') {
      const updatedAnnotation = {
        ...currentAnnotation,
        points: [...(currentAnnotation.points || []), { x, y }],
      };
      setCurrentAnnotation(updatedAnnotation);

      // Draw current stroke immediately
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        redrawCanvas();
        drawAnnotation(ctx, updatedAnnotation);
      }
    } else {
      const updatedAnnotation = {
        ...currentAnnotation,
        width: x - currentAnnotation.x,
        height: y - currentAnnotation.y,
      };
      setCurrentAnnotation(updatedAnnotation);

      // Draw current annotation immediately
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        redrawCanvas();
        drawAnnotation(ctx, updatedAnnotation);
      }
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    setIsDrawing(false);
    addAnnotation(currentAnnotation);
    setCurrentAnnotation(null);
    vibrate(100);
  };

  const addAnnotation = (annotation: Annotation) => {
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const addTextAnnotation = () => {
    if (!textPosition || !textInput.trim()) return;

    const textAnnotation: Annotation = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      x: textPosition.x,
      y: textPosition.y,
      text: textInput.trim(),
      color: currentColor,
      strokeWidth,
    };

    addAnnotation(textAnnotation);
    setTextInput('');
    setTextPosition(null);
    setShowTextDialog(false);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
      vibrate(50);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
      vibrate(50);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const annotatedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
      onSave(annotatedImageUrl, annotations);
      toast.showSuccess('Photo annotations saved');
      onClose();
    } catch (error) {
      console.error('Failed to save annotations:', error);
      toast.showError('Failed to save annotations');
    }
  };

  const tools = [
    { type: 'arrow' as const, icon: ArrowForward, label: 'Arrow' },
    { type: 'circle' as const, icon: RadioButtonUnchecked, label: 'Circle' },
    { type: 'rectangle' as const, icon: CropFree, label: 'Rectangle' },
    { type: 'text' as const, icon: TextFields, label: 'Text' },
    { type: 'freehand' as const, icon: Brush, label: 'Draw' },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: { background: '#000' },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
          {/* Canvas */}
          <Box
            sx={{
              width: '100%',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                cursor: readOnly ? 'default' : 'crosshair',
              }}
            />
          </Box>

          {/* Top Controls */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>

            <Typography variant='h6' sx={{ color: 'white' }}>
              Annotate Photo
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {!readOnly && (
                <>
                  <IconButton onClick={undo} disabled={historyIndex <= 0} sx={{ color: 'white' }}>
                    <Undo />
                  </IconButton>
                  <IconButton
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    sx={{ color: 'white' }}
                  >
                    <Redo />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>

          {/* Tool Panel */}
          {!readOnly && (
            <Paper
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                p: 1,
                background: alpha('#000', 0.8),
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {tools.map(({ type, icon: Icon, label }) => (
                <IconButton
                  key={type}
                  onClick={() => {
                    setCurrentTool(type);
                    vibrate(50);
                  }}
                  sx={{
                    color: currentTool === type ? theme.palette.primary.main : 'white',
                    background:
                      currentTool === type ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                  }}
                  title={label}
                >
                  <Icon />
                </IconButton>
              ))}
            </Paper>
          )}

          {/* Color and Settings Panel */}
          {!readOnly && (
            <Paper
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                p: 1,
                background: alpha('#000', 0.8),
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                alignItems: 'center',
                minWidth: 60,
              }}
            >
              {/* Color Palette */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {colors.map(color => (
                  <Box
                    key={color}
                    onClick={() => {
                      setCurrentColor(color);
                      vibrate(50);
                    }}
                    sx={{
                      width: 30,
                      height: 30,
                      background: color,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: currentColor === color ? '3px solid white' : '2px solid transparent',
                    }}
                  />
                ))}
              </Box>

              {/* Stroke Width */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant='caption' sx={{ color: 'white', mb: 1 }}>
                  Size
                </Typography>
                <Slider
                  orientation='vertical'
                  value={strokeWidth}
                  min={1}
                  max={10}
                  step={1}
                  onChange={(_, value) => setStrokeWidth(value as number)}
                  sx={{ height: 80, color: 'white' }}
                  size='small'
                />
              </Box>

              {/* Image Adjustments */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Brightness4 sx={{ color: 'white', fontSize: 16, mb: 1 }} />
                <Slider
                  orientation='vertical'
                  value={brightness}
                  min={50}
                  max={150}
                  onChange={(_, value) => setBrightness(value as number)}
                  sx={{ height: 60, color: 'white' }}
                  size='small'
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Contrast sx={{ color: 'white', fontSize: 16, mb: 1 }} />
                <Slider
                  orientation='vertical'
                  value={contrast}
                  min={50}
                  max={150}
                  onChange={(_, value) => setContrast(value as number)}
                  sx={{ height: 60, color: 'white' }}
                  size='small'
                />
              </Box>
            </Paper>
          )}

          {/* Bottom Actions */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {!readOnly && (
              <Button
                variant='contained'
                color='primary'
                onClick={handleSave}
                startIcon={<Save />}
                size='large'
              >
                Save Annotations
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Text Input Dialog */}
      <Dialog open={showTextDialog} onClose={() => setShowTextDialog(false)}>
        <DialogContent>
          <Typography variant='h6' gutterBottom>
            Add Text Annotation
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder='Enter your text annotation...'
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTextDialog(false)}>Cancel</Button>
          <Button onClick={addTextAnnotation} variant='contained' disabled={!textInput.trim()}>
            Add Text
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
