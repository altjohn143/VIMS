import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const PUSH_TOKEN_KEY = 'pushToken';
let cachedAuthToken;
let cachedPushToken;

export const setAuthToken = async (token) => {
  cachedAuthToken = token || null;
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getAuthToken = async () => {
  if (cachedAuthToken !== undefined) return cachedAuthToken;
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) {
    cachedAuthToken = secureToken;
    return secureToken;
  }

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  cachedAuthToken = legacyToken || null;
  return cachedAuthToken;
};

export const removeAuthToken = async () => {
  cachedAuthToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const setStoredPushToken = async (token) => {
  cachedPushToken = token || null;
  if (!token) {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
};

export const getStoredPushToken = async () => {
  if (cachedPushToken !== undefined) return cachedPushToken;
  const securePushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (securePushToken) {
    cachedPushToken = securePushToken;
    return securePushToken;
  }

  const legacyPushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (legacyPushToken) {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, legacyPushToken);
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
  cachedPushToken = legacyPushToken || null;
  return cachedPushToken;
};

export const removeStoredPushToken = async () => {
  cachedPushToken = null;
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
};
