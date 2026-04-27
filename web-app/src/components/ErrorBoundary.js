import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Error Boundary Component
 * Catches React errors and displays a user-friendly error screen
 * Prevents entire app from crashing
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send to error tracking service in production (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
      console.error('Error details for production logging:', {
        message: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            textAlign="center"
            gap={2}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 80,
                color: 'error.main',
                mb: 2
              }}
            />
            
            <Typography variant="h4" component="h1" gutterBottom>
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </Typography>

            {process.env.NODE_ENV === 'development' && (
              <Box
                sx={{
                  backgroundColor: '#f5f5f5',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'left',
                  width: '100%',
                  maxHeight: 200,
                  overflow: 'auto',
                  mb: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Error Details (Development Only):
                </Typography>
                <Typography
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'error.main',
                    fontSize: '0.75rem'
                  }}
                >
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            <Box gap={1} display="flex">
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </Button>
            </Box>

            {this.state.errorCount > 3 && (
              <Typography variant="caption" color="error" sx={{ mt: 2 }}>
                Multiple errors detected. Please refresh the page completely.
              </Typography>
            )}
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
