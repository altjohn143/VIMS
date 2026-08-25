import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import api from '../../utils/api';
import { themeColors, roleLayouts } from '../../utils/theme';

const SCAN_FEEDBACK = {
  invalid_pass: {
    title: 'Invalid Visitor Pass',
    message: 'Please scan a valid VIMS visitor pass.',
    icon: 'alert-circle-outline',
    color: '#ef4444',
  },
  expired: {
    title: 'Expired Pass',
    message: 'This visitor pass has expired. Ask the resident to create a new pass.',
    icon: 'time-outline',
    color: '#f97316',
  },
  already_used: {
    title: 'Already Used',
    message: 'This visitor pass has already been completed and can no longer be used.',
    icon: 'checkmark-done-outline',
    color: '#64748b',
  },
  rejected: {
    title: 'Rejected Pass',
    message: 'This visitor pass was rejected and cannot be used.',
    icon: 'close-circle-outline',
    color: '#dc2626',
  },
  cancelled: {
    title: 'Cancelled Pass',
    message: 'This visitor pass was cancelled by the resident or admin.',
    icon: 'ban-outline',
    color: '#b91c1c',
  },
  duplicate_entry_scan: {
    title: 'Entry Already Scanned',
    message: 'All visitors on this pass have already been scanned for gate entry.',
    icon: 'log-in-outline',
    color: '#f59e0b',
  },
  duplicate_exit_scan: {
    title: 'Exit Already Scanned',
    message: 'All visitors on this pass have already been scanned for gate exit.',
    icon: 'log-out-outline',
    color: '#f59e0b',
  },
  resident_confirmation_required: {
    title: 'Resident Confirmation Needed',
    message: 'The resident must confirm the visitor step in their app before this scan can continue.',
    icon: 'person-circle-outline',
    color: '#eab308',
  },
  entry_required: {
    title: 'Entry Scan Required',
    message: 'This pass has not been scanned for entry yet. Use Entry QR Scanner first.',
    icon: 'return-up-forward-outline',
    color: '#38bdf8',
  },
  not_ready: {
    title: 'Pass Not Ready',
    message: 'This visitor pass is not approved for scanning yet.',
    icon: 'hourglass-outline',
    color: '#a855f7',
  },
  network_unavailable: {
    title: 'Network Unavailable',
    message: 'Cannot reach the VIMS server. Check the connection, then scan again.',
    icon: 'cloud-offline-outline',
    color: '#f97316',
  },
  server_error: {
    title: 'Scanner Service Error',
    message: 'The server could not process this scan. Please try again.',
    icon: 'server-outline',
    color: '#ef4444',
  },
};

const inferQrScanCode = (message = '') => {
  const normalized = String(message).toLowerCase();
  if (normalized.includes('expired')) return 'expired';
  if (normalized.includes('already been used') || normalized.includes('no longer valid')) return 'already_used';
  if (normalized.includes('rejected')) return 'rejected';
  if (normalized.includes('cancelled')) return 'cancelled';
  if (normalized.includes('already been scanned for gate entry')) return 'duplicate_entry_scan';
  if (normalized.includes('already been scanned for gate exit')) return 'duplicate_exit_scan';
  if (normalized.includes('resident must')) return 'resident_confirmation_required';
  if (normalized.includes('entry at the gate first') || normalized.includes('entry qr scanner')) return 'entry_required';
  if (normalized.includes('not ready') || normalized.includes('pending')) return 'not_ready';
  return 'invalid_pass';
};

const getQrScanFeedback = (error) => {
  if (!error?.response) {
    return SCAN_FEEDBACK.network_unavailable;
  }

  const serverCode = error.response?.data?.code;
  const serverMessage = error.response?.data?.error;
  const code = serverCode || inferQrScanCode(serverMessage);
  const fallback = SCAN_FEEDBACK[code] || SCAN_FEEDBACK.invalid_pass;

  return {
    ...fallback,
    code,
    message: serverMessage || fallback.message,
    progress: error.response?.data?.progress,
  };
};

const extractVisitorPassToken = (rawValue = '') => {
  if (!rawValue || typeof rawValue !== 'string') return '';

  let value = rawValue.trim();
  try {
    value = decodeURIComponent(value).trim();
  } catch (error) {
    // Keep the raw value if it is not URI-encoded text.
  }
  if (!value) return '';

  const candidates = [value];
  if (value.includes('/')) {
    candidates.push(...value.split('/').filter(Boolean));
  }

  if (typeof atob === 'function') {
    try {
      candidates.push(atob(value));
    } catch (error) {
      // Ignore non-base64 QR values.
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      candidates.push(parsed.qrToken, parsed.qrCode, parsed.token);
    } catch (error) {
      // Ignore non-JSON QR values.
    }
  }

  const token = candidates.find((candidate) => (
    typeof candidate === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.trim())
  ));

  return token ? token.trim() : '';
};

const SecurityQrScannerScreen = ({ route }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isHandlingScan, setIsHandlingScan] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [lastIssue, setLastIssue] = useState(null);
  const [scanMode, setScanMode] = useState('entry');
  const recentScanRef = useRef({ value: '', at: 0 });

  useEffect(() => {
    if (route?.params?.mode === 'entry' || route?.params?.mode === 'exit') {
      setScanMode(route.params.mode);
    }
  }, [route?.params?.mode]);

  const requestCameraPermission = async () => {
    if (typeof Camera?.requestCameraPermissionsAsync === 'function') {
      return Camera.requestCameraPermissionsAsync();
    }
    if (typeof Camera?.requestPermissionsAsync === 'function') {
      return Camera.requestPermissionsAsync();
    }
    return { granted: false };
  };

  const ensurePermission = async () => {
    if (hasPermission) return true;
    const result = await requestCameraPermission();
    const granted = !!result?.granted;
    setHasPermission(granted);
    return granted;
  };

  const showScanIssueAlert = (feedback) => {
    setLastIssue({
      ...feedback,
      at: new Date().toISOString(),
    });
    setTimeout(() => {
      Alert.alert(
        feedback.title || 'Scan Failed',
        feedback.message || 'Please scan a valid VIMS visitor pass.',
        [{ text: 'Scan Again', onPress: () => setIsHandlingScan(false) }]
      );
    }, 80);
  };

  const handleSecurityScan = async ({ data }) => {
    if (isHandlingScan || !data) return;

    setIsHandlingScan(true);
    const visitorPassToken = extractVisitorPassToken(data);
    if (!visitorPassToken) {
      showScanIssueAlert({
        ...SCAN_FEEDBACK.invalid_pass,
        code: 'invalid_pass',
        message: 'Invalid QR code. Please scan a valid VIMS visitor pass.',
      });
      return;
    }

    const now = Date.now();
    if (
      recentScanRef.current.value === `${scanMode}:${visitorPassToken}` &&
      now - recentScanRef.current.at < 3500
    ) {
      showScanIssueAlert({
        title: 'Duplicate Scan Ignored',
        message: 'This same QR was just scanned. Wait a moment before scanning it again.',
        icon: 'scan-circle-outline',
        color: '#f59e0b',
        code: 'duplicate_camera_read',
      });
      return;
    }
    recentScanRef.current = { value: `${scanMode}:${visitorPassToken}`, at: now };

    let shouldUnlockAutomatically = true;
    try {
      const response = await api.post('/visitors/scan-action', { scanValue: visitorPassToken, action: scanMode });
      if (response.data?.success) {
        const action = response.data?.data?.action;
        const nextAction = response.data?.data?.nextAction;
        const visitor = response.data?.data?.visitor;
        const progress = response.data?.data?.progress || visitor?.scanProgress;
        setLastResult({
          action,
          nextAction,
          visitorName: visitor?.visitorName || 'Visitor',
          residentName: visitor?.residentId
            ? `${visitor.residentId.firstName || ''} ${visitor.residentId.lastName || ''}`.trim()
            : 'Resident',
          houseNumber: visitor?.residentId?.houseNumber || 'N/A',
          status: visitor?.qrStatus || visitor?.status || 'Processed',
          progress,
          at: new Date().toISOString(),
        });
        setLastIssue(null);
        Alert.alert(
          'Scan Success',
          response.data.message || (action === 'entry_logged'
            ? 'Visitor entry logged and resident notified.'
            : 'Visitor exit logged.')
        );
      } else {
        shouldUnlockAutomatically = false;
        showScanIssueAlert(getQrScanFeedback({
          response: {
            status: response.status,
            data: response.data,
          },
        }));
      }
    } catch (error) {
      shouldUnlockAutomatically = false;
      showScanIssueAlert(getQrScanFeedback(error));
    } finally {
      if (shouldUnlockAutomatically) {
        setTimeout(() => setIsHandlingScan(false), 900);
      }
    }
  };

  const formatAction = (action) => {
    if (action === 'entry_logged') return 'Entry logged';
    if (action === 'exit_logged') return 'Exit logged';
    return 'Processed';
  };

  const formatNextAction = (nextAction) => {
    if (nextAction === 'resident_confirmation') return 'Ask resident to confirm arrival/departure in the app.';
    if (nextAction === 'next_exit_scan') return 'Continue scanning exits until all visitors in the group are out.';
    if (nextAction === 'completed') return 'Pass completed. No further gate action needed.';
    return 'Ready for next scan.';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="qr-code" size={22} color="white" />
        <Text style={styles.headerTitle}>Security QR Scanner</Text>
      </View>

      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'entry' && styles.modeButtonActive]}
          onPress={() => setScanMode('entry')}
        >
          <Ionicons name="log-in-outline" size={18} color={scanMode === 'entry' ? '#002F05' : '#D9FBEA'} />
          <Text style={[styles.modeButtonText, scanMode === 'entry' && styles.modeButtonTextActive]}>Entry QR Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'exit' && styles.modeButtonActive]}
          onPress={() => setScanMode('exit')}
        >
          <Ionicons name="log-out-outline" size={18} color={scanMode === 'exit' ? '#002F05' : '#D9FBEA'} />
          <Text style={[styles.modeButtonText, scanMode === 'exit' && styles.modeButtonTextActive]}>Exit QR Scanner</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraWrap}>
        {hasPermission ? (
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isHandlingScan ? undefined : handleSecurityScan}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="camera" size={42} color="#94a3b8" />
            <Text style={styles.cameraPlaceholderText}>Camera permission required</Text>
          </View>
        )}
        <View style={styles.overlayFrame} pointerEvents="none" />
      </View>

      {!hasPermission && (
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const ok = await ensurePermission();
            if (!ok) {
              Alert.alert('Camera Required', 'Please allow camera access to scan visitor passes.');
            }
          }}
        >
          <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>- Use Entry QR Scanner when each visitor enters the gate.</Text>
        <Text style={styles.infoText}>- Resident confirms arrival and departure in their app.</Text>
        <Text style={styles.infoText}>- Use Exit QR Scanner when each visitor leaves the gate.</Text>
      </View>

      {lastResult ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons
              name={lastResult.action === 'exit_logged' ? 'log-out-outline' : 'log-in-outline'}
              size={22}
              color="#D9FBEA"
            />
            <Text style={styles.resultTitle}>Last Scan</Text>
          </View>
          <Text style={styles.resultName}>{lastResult.visitorName}</Text>
          <Text style={styles.resultText}>Resident: {lastResult.residentName}</Text>
          <Text style={styles.resultText}>House: {lastResult.houseNumber}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{formatAction(lastResult.action)} • {lastResult.status}</Text>
          </View>
          {lastResult.progress ? (
            <Text style={styles.progressText}>
              Entry {lastResult.progress.entryScanCount}/{lastResult.progress.groupSize} | Arrival {lastResult.progress.residentArrivalConfirmCount}/{lastResult.progress.groupSize} | Departure {lastResult.progress.residentDepartureConfirmCount}/{lastResult.progress.groupSize} | Exit {lastResult.progress.exitScanCount}/{lastResult.progress.groupSize}
            </Text>
          ) : null}
          <Text style={styles.nextActionText}>{formatNextAction(lastResult.nextAction)}</Text>
        </View>
      ) : null}

      {lastIssue ? (
        <View style={[styles.issueCard, { borderColor: lastIssue.color }]}>
          <View style={styles.resultHeader}>
            <Ionicons
              name={lastIssue.icon || 'alert-circle-outline'}
              size={22}
              color={lastIssue.color || '#ef4444'}
            />
            <Text style={[styles.issueTitle, { color: lastIssue.color }]}>{lastIssue.title}</Text>
          </View>
          <Text style={styles.issueText}>{lastIssue.message}</Text>
          {lastIssue.progress ? (
            <Text style={styles.progressText}>
              Entry {lastIssue.progress.entryScanCount}/{lastIssue.progress.groupSize} | Arrival {lastIssue.progress.residentArrivalConfirmCount}/{lastIssue.progress.groupSize} | Departure {lastIssue.progress.residentDepartureConfirmCount}/{lastIssue.progress.groupSize} | Exit {lastIssue.progress.exitScanCount}/{lastIssue.progress.groupSize}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => setIsHandlingScan(false)}
          >
            <Text style={styles.scanAgainButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    ...roleLayouts.security.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 23,
    fontWeight: '900',
  },
  modeBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#007A18',
    backgroundColor: '#002F05',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: '#D9FBEA',
  },
  modeButtonText: {
    color: '#D9FBEA',
    fontWeight: '900',
    fontSize: 12,
  },
  modeButtonTextActive: {
    color: '#002F05',
  },
  cameraWrap: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    height: 390,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  cameraPlaceholderText: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 13,
  },
  overlayFrame: {
    position: 'absolute',
    left: '20%',
    top: '23%',
    width: '60%',
    height: '54%',
    borderWidth: 2,
    borderColor: '#00D084',
    borderRadius: 28,
    backgroundColor: 'transparent',
  },
  permissionButton: {
    marginHorizontal: 16,
    marginTop: -4,
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 13,
    marginBottom: 4,
  },
  resultCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#002F05',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#007A18',
  },
  issueCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    color: '#D9FBEA',
    fontSize: 14,
    fontWeight: '700',
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  resultText: {
    color: 'white',
    fontSize: 13,
    marginBottom: 4,
  },
  issueText: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 19,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#007A18',
  },
  statusPillText: {
    color: '#dcfce7',
    fontSize: 12,
    fontWeight: '800',
  },
  nextActionText: {
    color: '#D9FBEA',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  progressText: {
    color: '#dcfce7',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  scanAgainButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#D9FBEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanAgainButtonText: {
    color: '#002F05',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default SecurityQrScannerScreen;
