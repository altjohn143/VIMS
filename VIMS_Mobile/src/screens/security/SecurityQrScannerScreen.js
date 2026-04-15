import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import api from '../../utils/api';
import { themeColors } from '../../utils/theme';

const SecurityQrScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isHandlingScan, setIsHandlingScan] = useState(false);
  const [lastResult, setLastResult] = useState(null);

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
      const response = await api.post('/visitors/scan-action', { scanValue: data });
      if (response.data?.success) {
        const action = response.data?.data?.action;
        const visitor = response.data?.data?.visitor;
        setLastResult({
          action,
          visitorName: visitor?.visitorName || 'Visitor',
          at: new Date().toISOString(),
        });
        Alert.alert(
          'Scan Success',
          action === 'entry_logged'
            ? 'Visitor entry logged and resident notified.'
            : 'Visitor exit logged. Pass is now completed.'
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="qr-code" size={22} color="white" />
        <Text style={styles.headerTitle}>Security QR Scanner</Text>
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
        <Text style={styles.infoText}>- First scan logs gate entry and notifies resident.</Text>
        <Text style={styles.infoText}>- Resident confirms by scanning the same visitor pass.</Text>
        <Text style={styles.infoText}>- Final scan logs exit and completes the pass.</Text>
      </View>

      {lastResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Last Scan</Text>
          <Text style={styles.resultText}>{lastResult.visitorName}</Text>
          <Text style={styles.resultText}>{formatAction(lastResult.action)}</Text>
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
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: themeColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  cameraWrap: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    height: 340,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
  resultTitle: {
    color: '#bbf7d0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  resultText: {
    color: 'white',
    fontSize: 13,
  },
});

export default SecurityQrScannerScreen;
