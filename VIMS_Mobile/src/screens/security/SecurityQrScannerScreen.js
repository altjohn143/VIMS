import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import api from '../../utils/api';
import { themeColors, roleLayouts } from '../../utils/theme';

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

  const handleSecurityScan = async ({ data }) => {
    if (isHandlingScan || !data) return;

    setIsHandlingScan(true);
    try {
      const response = await api.post('/visitors/scan-action', { scanValue: data, action: scanMode });
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
      Alert.alert('Scan Failed', error?.response?.data?.error || 'Unable to process visitor pass');
    } finally {
      setTimeout(() => setIsHandlingScan(false), 900);
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
          <Ionicons name="log-in-outline" size={18} color={scanMode === 'entry' ? '#052e16' : '#bbf7d0'} />
          <Text style={[styles.modeButtonText, scanMode === 'entry' && styles.modeButtonTextActive]}>Entry QR Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'exit' && styles.modeButtonActive]}
          onPress={() => setScanMode('exit')}
        >
          <Ionicons name="log-out-outline" size={18} color={scanMode === 'exit' ? '#052e16' : '#bbf7d0'} />
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
              color="#bbf7d0"
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
    borderColor: '#166534',
    backgroundColor: '#052e16',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: '#bbf7d0',
  },
  modeButtonText: {
    color: '#bbf7d0',
    fontWeight: '900',
    fontSize: 12,
  },
  modeButtonTextActive: {
    color: '#052e16',
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
    borderColor: '#22c55e',
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
    backgroundColor: '#052e16',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#166534',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    color: '#bbf7d0',
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
    backgroundColor: '#166534',
  },
  statusPillText: {
    color: '#dcfce7',
    fontSize: 12,
    fontWeight: '800',
  },
  nextActionText: {
    color: '#bbf7d0',
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
