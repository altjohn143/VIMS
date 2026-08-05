import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const PUSH_TOKEN_KEY = 'pushToken';

export const setAuthToken = async (token) => {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getAuthToken = async () => {
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  return legacyToken;
};

export const removeAuthToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const setStoredPushToken = async (token) => {
  if (!token) {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
};

export const getStoredPushToken = async () => {
  const securePushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (securePushToken) return securePushToken;

  const legacyPushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (legacyPushToken) {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, legacyPushToken);
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
  return legacyPushToken;
};

export const removeStoredPushToken = async () => {
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
};
