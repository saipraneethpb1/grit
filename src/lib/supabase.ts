import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-anon')
);

/** Avoid touching window/AsyncStorage during SSR (Expo static web export). */
const isBrowser = typeof window !== 'undefined';
const isNative = Platform.OS !== 'web';
const canPersist = isNative || isBrowser;

const authStorage: SupportedStorage = {
  getItem: async (key) => {
    if (isNative) {
      const saved = await SecureStore.getItemAsync(key);
      if (saved !== null) {
        await AsyncStorage.removeItem(key);
        return saved;
      }
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        await SecureStore.setItemAsync(key, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    }
    if (!isBrowser) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (isNative) {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key);
      return;
    }
    if (!isBrowser) return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (isNative) {
      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (!isBrowser) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: canPersist,
      persistSession: canPersist,
      detectSessionInUrl: false,
    },
  }
);
