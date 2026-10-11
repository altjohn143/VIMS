import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Typography } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';

function PdfPages({ blob }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!blob || !containerRef.current) return undefined;
    let cancelled = false;
    const container = containerRef.current;
    container.replaceChildren();
    setError('');
    setRendering(true);

    const render = async (hasRetried = false) => {
      if (cancelled) return;
      setRendering(true);
      try {
        const loadingTask = pdfjsLib.getDocument({ data: await blob.arrayBuffer() });
        const pdf = await loadingTask.promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          if (cancelled) break;
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.background = '#fff';
          canvas.style.boxShadow = '0 2px 9px rgba(0,0,0,.22)';
          if (cancelled) break;
          container.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (renderError) {
        // PDF.js can lose its newly-created worker during the first report change.
        // Retry once automatically so users never need to refresh the whole page.
        if (!cancelled && !hasRetried) {
          window.setTimeout(() => render(true), 150);
          return;
        }
        console.error('PDF preview rendering failed:', renderError);
        if (!cancelled) setError('The PDF preview could not be rendered. You can still download the file.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    };
    render();

    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <Box sx={{ position: 'relative', height: '100%', overflow: 'auto', bgcolor: '#535353', p: { xs: 1.5, md: 3 } }}>
      {(rendering || !blob) && <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}><CircularProgress sx={{ color: '#fff' }} /></Box>}
      {error && <Typography color="error" sx={{ bgcolor: '#fff', p: 2, borderRadius: 1 }}>{error}</Typography>}
      <Box ref={containerRef} sx={{ display: 'grid', gap: 3, maxWidth: 1050, mx: 'auto' }} />
    </Box>
  );
}

/** Renders report pages directly, avoiding the browser PDF viewer's toolbar and thumbnail rail. */
export default function PdfExportPreviewDialog({ blob, filename, onClose, inline = false, loading = false }) {
  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'VIMS_Export.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    if (!inline) onClose();
  };

  const previewBody = <PdfPages blob={blob} />;

  if (inline) {
    return (
      <Paper variant="outlined" sx={{ mt: 4, overflow: 'hidden', borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>Report preview</Typography>
            <Typography variant="body2" color="text.secondary">{loading ? 'Preparing your selected report…' : 'Review the report before downloading it.'}</Typography>
          </Box>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={!blob || loading}>Download PDF</Button>
        </Box>
        <Box sx={{ height: { xs: '60vh', md: '78vh' } }}>{previewBody}</Box>
      </Paper>
    );
  }

  return (
    <Dialog open={Boolean(blob)} onClose={onClose} fullWidth maxWidth="xl" aria-labelledby="pdf-export-preview-title">
      <DialogTitle id="pdf-export-preview-title">PDF export preview</DialogTitle>
      <DialogContent dividers sx={{ height: '75vh', p: 0 }}>{previewBody}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>Review the report, then export it when ready.</Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={!blob}>Export PDF</Button>
      </DialogActions>
    </Dialog>
  );
}
