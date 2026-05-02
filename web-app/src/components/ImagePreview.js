import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Card,
  CardMedia
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const ImagePreview = ({
  file,
  label,
  onRemove,
  showRemove = true,
  size = 80,
  showZoom = true,
  sx = {}
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!file) return null;

  const imageUrl = file instanceof File ? URL.createObjectURL(file) : file;

  return (
    <>
      <Card
        sx={{
          width: size,
          height: size,
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          border: '2px solid #e0e0e0',
          ...sx
        }}
      >
        <CardMedia
          component="img"
          image={imageUrl}
          alt={label}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            cursor: showZoom ? 'pointer' : 'default'
          }}
          onClick={() => showZoom && setPreviewOpen(true)}
        />

        {/* Status indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(16, 185, 129, 0.9)',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 12, color: 'white' }} />
        </Box>

        {/* Zoom button */}
        {showZoom && (
          <IconButton
            size="small"
            onClick={() => setPreviewOpen(true)}
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)'
              },
              width: 24,
              height: 24
            }}
          >
            <ZoomInIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}

        {/* Remove button */}
        {showRemove && onRemove && (
          <IconButton
            size="small"
            onClick={onRemove}
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 1)'
              },
              width: 20,
              height: 20
            }}
          >
            <DeleteIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Card>

      {/* Full-size preview dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{label}</Typography>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="img"
            src={imageUrl}
            alt={label}
            sx={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          {file?.name && (
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary">
                File: {file.name}
              </Typography>
              {file.size && (
                <Typography variant="body2" color="text.secondary">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImagePreview;