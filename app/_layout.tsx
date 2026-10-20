import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
} from '@expo-google-fonts/sora';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Platform, StatusBar, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { colors } from '@/constants/Colors';
import { AuthProvider } from '@/src/hooks/useAuth';
import { AppearanceProvider } from '@/src/hooks/useAppearance';
import type { ColorScheme } from '@/constants/Colors';
import { useWidgetSync } from '@/src/hooks/useWidgetSync';
import { useOutboxSync } from '@/src/hooks/useWorkoutOutbox';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Plans and stats change only when this device writes them, so a short
        // freshness window stops every navigation from re-running the whole
        // fetch chain and flashing a spinner over content already on screen.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: true,
      },
    },
  });
}

/**
 * React Query's default focus tracking is browser-only; without this, returning
 * from the background leaves the app showing whatever it loaded hours ago.
 */
function useAppStateFocusManager() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS === 'web') return;
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  // Sora and Inter are the whole typographic system; rendering before they land
  // would flash every screen in the platform fallback face.
  const [loaded, error] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
  });
  const [queryClient] = useState(makeQueryClient);

  useAppStateFocusManager();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <AppearanceProvider>
      {({ ready, scheme }) =>
        ready ? (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootLayoutNav scheme={scheme} />
            </AuthProvider>
          </QueryClientProvider>
        ) : null
      }
    </AppearanceProvider>
  );
}

function RootLayoutNav({ scheme }: { scheme: ColorScheme }) {
  useWidgetSync();
  useOutboxSync();
  // Fonts and the stored appearance are both in by now, so nothing flashes.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.divider,
      notification: colors.accent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar barStyle={scheme === 'light' ? 'dark-content' : 'light-content'} />
      {/* Keyed by scheme: every screen remounts with the new palette's styles. */}
      <Stack key={scheme} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemeProvider>
  );
}
