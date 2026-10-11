import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Typography } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

/**
 * Keeps PDF exports reviewable before a file is saved to the user's device.
 */
export default function PdfExportPreviewDialog({ blob, filename, onClose, inline = false, loading = false }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!blob) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const download = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = filename || 'VIMS_Export.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (!inline) onClose();
  };

  const previewBody = previewUrl ? (
    <Box component="iframe" title="PDF export preview" src={previewUrl} sx={{ border: 0, display: 'block', width: '100%', height: '100%' }} />
  ) : (
    <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  );

  if (inline) {
    return (
      <Paper variant="outlined" sx={{ mt: 4, overflow: 'hidden', borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>Report preview</Typography>
            <Typography variant="body2" color="text.secondary">{loading ? 'Preparing your selected report…' : 'Review the report before downloading it.'}</Typography>
          </Box>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={!previewUrl || loading}>Download PDF</Button>
        </Box>
        <Box sx={{ height: { xs: '60vh', md: '78vh' }, bgcolor: '#525252' }}>{previewBody}</Box>
      </Paper>
    );
  }

  return (
    <Dialog open={Boolean(blob)} onClose={onClose} fullWidth maxWidth="xl" aria-labelledby="pdf-export-preview-title">
      <DialogTitle id="pdf-export-preview-title">PDF export preview</DialogTitle>
      <DialogContent dividers sx={{ height: '75vh', p: 0, bgcolor: '#f3f5f7' }}>
        {previewBody}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>Review the report, then export it when ready.</Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={!previewUrl}>Export PDF</Button>
      </DialogActions>
    </Dialog>
  );
}
