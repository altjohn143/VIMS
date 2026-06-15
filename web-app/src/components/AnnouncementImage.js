import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';
import axios from '../config/axios';

const buildUploadUrl = (image) => {
  if (!image) return null;
  const value = String(image);
  if (value.startsWith('http')) return value;

  const backendBaseUrl = axios.defaults.baseURL || window.location.origin;
  const normalizedBase = backendBaseUrl.replace(/\/$/, '');
  const normalizedImage = value.replace(/^\/+/, '');

  if (normalizedImage.startsWith('uploads/announcements/')) {
    return `${normalizedBase}/${normalizedImage}`;
  }

  return `${normalizedBase}/uploads/announcements/${normalizedImage}`;
};

const AnnouncementImage = ({
  image,
  imageUrl,
  title = 'Announcement',
  compact = false,
  sx = {}
}) => {
  const imageSources = useMemo(() => {
    const sources = [imageUrl, buildUploadUrl(image)]
      .filter(Boolean)
      .map(String);

    return [...new Set(sources)];
  }, [image, imageUrl]);

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [imageSources]);

  const currentSource = imageSources[sourceIndex];
  const showFallback = !currentSource;

  const commonSx = compact
    ? {
        width: 58,
        height: 58,
        borderRadius: 2,
        flexShrink: 0,
        ...sx
      }
    : {
        width: '100%',
        maxHeight: 260,
        borderRadius: '14px',
        ...sx
      };

  if (showFallback) {
    return (
      <Box
        sx={{
          ...commonSx,
          bgcolor: '#f0fdf4',
          border: '1px solid rgba(22, 101, 52, 0.14)',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: compact ? 0.25 : 1,
          overflow: 'hidden',
          textAlign: 'center',
          p: compact ? 0.5 : 2
        }}
      >
        <CampaignIcon fontSize={compact ? 'small' : 'medium'} />
        {!compact && (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={currentSource}
      alt={title}
      onError={() => setSourceIndex((index) => index + 1)}
      sx={{
        ...commonSx,
        objectFit: compact ? 'cover' : 'contain',
        bgcolor: '#f8fafc',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'block'
      }}
    />
  );
};

export default AnnouncementImage;
