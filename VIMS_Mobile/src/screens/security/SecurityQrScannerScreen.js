import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import api from '../../utils/api';
import { themeColors, roleLayouts } from '../../utils/theme';

const getQrScanErrorMessage = (error) => {
  const serverMessage = error?.response?.data?.error;
  if (!serverMessage) return 'Please scan a valid VIMS visitor pass.';

  const normalized = String(serverMessage).toLowerCase();
  if (
    normalized.includes('invalid qr') ||
    normalized.includes('not found') ||
    normalized.includes('no longer valid') ||
    normalized.includes('expired') ||
    normalized.includes('already been used')
  ) {
    return serverMessage;
  }

  return serverMessage || 'Please scan a valid VIMS visitor pass.';
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
  const [scanMode, setScanMode] = useState('entry');

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

  const showInvalidPassAlert = (message) => {
    setTimeout(() => {
      Alert.alert(
        'Invalid Visitor Pass',
        message || 'Invalid QR code. Please scan a valid VIMS visitor pass.',
        [{ text: 'Scan Again', onPress: () => setIsHandlingScan(false) }]
      );
    }, 80);
  };

  const handleSecurityScan = async ({ data }) => {
    if (isHandlingScan || !data) return;

    setIsHandlingScan(true);
    const visitorPassToken = extractVisitorPassToken(data);
    if (!visitorPassToken) {
      showInvalidPassAlert('Invalid QR code. Please scan a valid VIMS visitor pass.');
      return;
    }

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
        Alert.alert(
          'Scan Success',
          response.data.message || (action === 'entry_logged'
            ? 'Visitor entry logged and resident notified.'
            : 'Visitor exit logged.')
        );
      }
    } catch (error) {
      shouldUnlockAutomatically = false;
      showInvalidPassAlert(getQrScanErrorMessage(error));
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
});

export default SecurityQrScannerScreen;
