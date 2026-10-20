import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { applyColorScheme, colors, type ColorScheme } from '@/constants/Colors';

export type AppearancePreference = 'system' | 'light' | 'dark';

const KEY = 'ryvora.appearance.v1';

type AppearanceValue = {
  preference: AppearancePreference;
  scheme: ColorScheme;
  setPreference: (p: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

/**
 * Light, dark, or follow the phone. The chosen palette is applied to the live
 * `colors` before children render, and `scheme` keys the tree so every screen
 * remounts with it; workouts in progress survive through the saved draft.
 * `ready` is false until the stored preference is read, so the app never
 * flashes the wrong theme on launch.
 */
export function AppearanceProvider({ children }: { children: (state: { ready: boolean; scheme: ColorScheme }) => ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setPreferenceState(v === 'light' || v === 'dark' || v === 'system' ? v : 'system'))
      .catch(() => setPreferenceState('system'));
  }, []);

  const scheme: ColorScheme = preference === 'light' || preference === 'dark' ? preference : system === 'light' ? 'light' : 'dark';
  // Synchronous on purpose: children read `colors` during this same render.
  applyColorScheme(scheme);

  useEffect(() => {
    // The native root view shows behind screens during transitions and the keyboard.
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [scheme]);

  const setPreference = useCallback((p: AppearancePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference: preference ?? 'system', scheme, setPreference }), [preference, scheme, setPreference]);
  return <AppearanceContext.Provider value={value}>{children({ ready: preference !== null, scheme })}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const v = useContext(AppearanceContext);
  if (!v) throw new Error('useAppearance must be used inside AppearanceProvider');
  return v;
}
