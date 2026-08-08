import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.text} />
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
        headerTitleStyle: { ...theme.font.bodyMedium, fontSize: 17 },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="splits/index" options={{ title: 'New program' }} />
      <Stack.Screen name="splits/preview" options={{ title: 'Preview' }} />
      <Stack.Screen name="plan/[id]" options={{ title: 'Program' }} />
      <Stack.Screen name="plan/day/[dayId]" options={{ title: 'Day' }} />
      <Stack.Screen name="exercises/[id]" options={{ title: 'Exercise' }} />
      <Stack.Screen name="sources" options={{ title: 'Sources' }} />
      <Stack.Screen
        name="workout/[dayId]"
        options={{
          title: '',
          presentation: 'fullScreenModal',
          headerShown: false,
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
