import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../utils/theme';

const LAST_CRASH_KEY = 'vims_last_js_crash';

class AppErrorBoundary extends React.Component {
  state = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const report = {
      occurredAt: new Date().toISOString(),
      message: String(error?.message || error || 'Unknown JavaScript error').slice(0, 1000),
      componentStack: String(info?.componentStack || '').slice(0, 5000),
    };
    AsyncStorage.setItem(LAST_CRASH_KEY, JSON.stringify(report)).catch(() => {});
    console.error('VIMS recovered from a render error:', error, info);
  }

  retry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (!this.state.error) {
      return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <View style={styles.screen}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning-outline" size={30} color={themeColors.warning} />
        </View>
        <Text style={styles.title}>VIMS encountered a temporary problem</Text>
        <Text style={styles.message}>Your session is still safe. Try reopening this screen. A local diagnostic was saved for troubleshooting.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={this.retry}>
          <Ionicons name="refresh" size={18} color={themeColors.white} />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: themeColors.background },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.warningSoft },
  title: { marginTop: 18, color: themeColors.textPrimary, fontSize: 20, lineHeight: 26, fontWeight: '900', textAlign: 'center' },
  message: { marginTop: 10, color: themeColors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { marginTop: 22, minHeight: 48, paddingHorizontal: 22, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: themeColors.primary },
  retryText: { color: themeColors.white, fontSize: 14, fontWeight: '900' },
});

export { LAST_CRASH_KEY };
export default AppErrorBoundary;
