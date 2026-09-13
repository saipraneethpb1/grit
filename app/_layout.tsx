import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Platform, StatusBar, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { colors } from '@/constants/Colors';
import { AuthProvider } from '@/src/hooks/useAuth';

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
  // Inter is the whole typographic system; rendering before it lands would
  // flash every screen in the platform fallback face.
  const [loaded, error] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [queryClient] = useState(makeQueryClient);

  useAppStateFocusManager();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
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
      <StatusBar barStyle="light-content" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemeProvider>
  );
}
