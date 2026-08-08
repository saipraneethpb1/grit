import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { TERMS_OF_SERVICE } from '@/src/domain/legalContent';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Terms of Service',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.body}>{TERMS_OF_SERVICE}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  body: { ...theme.font.body, color: theme.colors.textSecondary, lineHeight: 22 },
});
