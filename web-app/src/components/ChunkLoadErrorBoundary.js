import React from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { isChunkLoadError } from '../utils/lazyWithRetry';

class ChunkLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VIMS application loading error:', error, info);
  }

  handleRefresh = () => {
    sessionStorage.removeItem('vims-chunk-reload');
    const url = new URL(window.location.href);
    url.searchParams.set('_vims_refresh', Date.now().toString());
    window.location.replace(url.toString());
  };

  render() {
    if (!this.state.error) return this.props.children;

    const chunkError = isChunkLoadError(this.state.error);
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: '#f3f5f7' }}>
        <Paper sx={{ maxWidth: 520, width: '100%', p: 4, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            {chunkError ? 'A new VIMS version is available' : 'VIMS could not load'}
          </Typography>
          <Alert severity={chunkError ? 'info' : 'error'} sx={{ mb: 3 }}>
            {chunkError
              ? 'Your browser has files from an older deployment. Refresh to load the latest version.'
              : 'An unexpected application error occurred. Refresh the page and try again.'}
          </Alert>
          <Button fullWidth variant="contained" onClick={this.handleRefresh}>
            Refresh VIMS
          </Button>
        </Paper>
      </Box>
    );
  }
}

export default ChunkLoadErrorBoundary;
