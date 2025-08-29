import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface TextWidgetProps {
  widget: {
    id: string;
    title: string;
    description?: string;
    config: {
      content?: string;
    };
    styling?: {
      backgroundColor?: string;
      borderColor?: string;
      textColor?: string;
      borderRadius?: number;
      shadow?: boolean;
      padding?: number;
    };
  };
  data?: {
    content: string;
  };
  error?: string;
  loading?: boolean;
  lastUpdated?: Date;
}

const TextWidget: React.FC<TextWidgetProps> = ({ widget, data, lastUpdated }) => {
  const content = data?.content || widget.config.content || '';

  // Simple markdown-like formatting
  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => {
      let formattedLine = line;

      // Handle headers
      if (line.startsWith('### ')) {
        return (
          <Typography key={index} variant='h6' gutterBottom sx={{ mt: index > 0 ? 2 : 0 }}>
            {line.substring(4)}
          </Typography>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Typography key={index} variant='h5' gutterBottom sx={{ mt: index > 0 ? 2 : 0 }}>
            {line.substring(3)}
          </Typography>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <Typography key={index} variant='h4' gutterBottom sx={{ mt: index > 0 ? 2 : 0 }}>
            {line.substring(2)}
          </Typography>
        );
      }

      // Handle bold text
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Handle italic text
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Handle empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }

      // Handle bullet points
      if (line.startsWith('- ')) {
        return (
          <Typography key={index} component='li' sx={{ ml: 2, mb: 0.5 }}>
            {line.substring(2)}
          </Typography>
        );
      }

      // Regular paragraph
      return (
        <Typography
          key={index}
          variant='body2'
          paragraph
          dangerouslySetInnerHTML={{ __html: formattedLine }}
          sx={{ mb: 1 }}
        />
      );
    });
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...widget.styling,
        ...(widget.styling?.shadow && {
          boxShadow: 3,
        }),
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: widget.styling?.padding ? widget.styling.padding / 8 : 2,
        }}
      >
        <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
          <Typography variant='subtitle2' color='text.secondary' noWrap>
            {widget.title}
          </Typography>
          {lastUpdated && (
            <Typography variant='caption' color='text.secondary'>
              {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        <Box
          flex={1}
          sx={{
            color: widget.styling?.textColor || 'text.primary',
            overflow: 'auto',
          }}
        >
          {content ? (
            formatText(content)
          ) : (
            <Box display='flex' alignItems='center' justifyContent='center' height='100%'>
              <Typography variant='body2' color='text.secondary' textAlign='center'>
                No content configured
              </Typography>
            </Box>
          )}
        </Box>

        {widget.description && (
          <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
            {widget.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TextWidget;
