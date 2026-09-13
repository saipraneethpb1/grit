import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { ...theme.font.heading },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ title: 'Log' }} />
      <Stack.Screen name="splits/index" options={{ title: 'New program' }} />
      <Stack.Screen name="splits/custom" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="splits/preview" options={{ title: 'Preview' }} />
      <Stack.Screen name="plan/[id]" options={{ title: 'Program' }} />
      <Stack.Screen name="plan/day/[dayId]" options={{ headerShown: false }} />
      <Stack.Screen name="exercises/[id]" options={{ title: '' }} />
      <Stack.Screen name="sources" options={{ title: 'Sources' }} />
      <Stack.Screen
        name="workout/[dayId]"
        options={{
          title: '',
          presentation: 'fullScreenModal',
          headerShown: false,
          // Leaving mid-workout must go through the confirmation in the screen,
          // so a swipe or predictive-back gesture cannot discard logged sets.
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

const styles = {
  center: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.background,
  },
};
