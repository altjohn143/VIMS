import AsyncStorage from '@react-native-async-storage/async-storage';
import { LAST_CRASH_KEY } from '../components/AppErrorBoundary';

export const installCrashDiagnostics = () => {
  const errorUtils = global?.ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler || global.__VIMS_CRASH_HANDLER__) return;

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    const report = {
      occurredAt: new Date().toISOString(),
      fatal: !!isFatal,
      message: String(error?.message || error || 'Unknown JavaScript error').slice(0, 1000),
      stack: String(error?.stack || '').slice(0, 8000),
    };
    AsyncStorage.setItem(LAST_CRASH_KEY, JSON.stringify(report)).catch(() => {});
    previousHandler?.(error, isFatal);
  });
  global.__VIMS_CRASH_HANDLER__ = true;
};
