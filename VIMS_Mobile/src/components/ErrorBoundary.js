import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Dimensions } from 'react-native';

/**
 * Error Boundary Component for React Native
 * Note: React Native doesn't have built-in error boundaries
 * This catches top-level errors via global error handler setup
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0
    };

    // Setup global error handler
    this._unsubscribeErrorHandler = null;
  }

  componentDidMount() {
    // In React Native, we need to handle errors differently
    // This is more of a wrapper component pattern
    ErrorUtils.setGlobalHandler(this.handleError);
  }

  componentWillUnmount() {
    if (this._unsubscribeErrorHandler) {
      this._unsubscribeErrorHandler();
    }
  }

  handleError = (error, isFatal) => {
    console.error('Global Error:', error, 'Is Fatal:', isFatal);

    this.setState(prevState => ({
      hasError: true,
      error,
      errorCount: prevState.errorCount + 1
    }));
  };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      hasError: true,
      error,
      errorCount: prevState.errorCount + 1
    }));
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      const screenHeight = Dimensions.get('window').height;
      
      return (
        <ScrollView
          contentContainerStyle={{
            minHeight: screenHeight,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            padding: 20
          }}
        >
          <View style={{ alignItems: 'center', width: '100%' }}>
            {/* Error Icon */}
            <Text style={{ fontSize: 50, marginBottom: 20 }}>⚠️</Text>

            {/* Error Title */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 10,
                textAlign: 'center',
                color: '#d32f2f'
              }}
            >
              Something went wrong
            </Text>

            {/* Error Message */}
            <Text
              style={{
                fontSize: 16,
                color: '#666',
                marginBottom: 20,
                textAlign: 'center',
                lineHeight: 22
              }}
            >
              An unexpected error occurred. Our team has been notified. Please try again.
            </Text>

            {/* Development Error Details */}
            {__DEV__ && this.state.error && (
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                  width: '100%',
                  borderLeftWidth: 4,
                  borderLeftColor: '#d32f2f'
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    marginBottom: 8,
                    color: '#333'
                  }}
                >
                  Development Error:
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: '#d32f2f',
                    fontFamily: 'Courier New',
                    lineHeight: 18
                  }}
                  numberOfLines={8}
                >
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            {/* Error Count Warning */}
            {this.state.errorCount > 3 && (
              <Text
                style={{
                  fontSize: 12,
                  color: '#d32f2f',
                  marginBottom: 20,
                  textAlign: 'center',
                  fontWeight: '600'
                }}
              >
                Multiple errors detected. Restarting the app may help.
              </Text>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={this.handleReset}
              style={{
                backgroundColor: '#1976d2',
                paddingVertical: 12,
                paddingHorizontal: 30,
                borderRadius: 6,
                marginBottom: 12,
                width: '100%'
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // Navigate to home or restart app
                this.props.navigation?.reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }]
                });
              }}
              style={{
                borderWidth: 1,
                borderColor: '#1976d2',
                paddingVertical: 12,
                paddingHorizontal: 30,
                borderRadius: 6,
                width: '100%'
              }}
            >
              <Text
                style={{
                  color: '#1976d2',
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                Go to Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
