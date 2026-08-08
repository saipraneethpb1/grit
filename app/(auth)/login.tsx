import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { GritLogo } from '@/src/components/GritLogo';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { LEGAL_LINKS, LEGAL_ROUTES } from '@/src/domain/legal';
import { useAuth } from '@/src/hooks/useAuth';

export default function LoginScreen() {
  const { signIn, configured } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  function openLegal(kind: 'terms' | 'privacy') {
    const url = LEGAL_LINKS[kind];
    if (url) {
      WebBrowser.openBrowserAsync(url);
      return;
    }
    router.push(LEGAL_ROUTES[kind]);
  }

  function inputStyle(field: 'email' | 'password') {
    return [
      styles.input,
      {
        borderColor: focused === field ? theme.colors.borderStrong : theme.colors.border,
      },
    ];
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + theme.space.lg, paddingBottom: insets.bottom + theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GritLogo showWordmark size={40} style={styles.brand} />
        <Text style={styles.headline}>Train with intention.</Text>
        <Text style={styles.subhead}>Sign in to access your program and log.</Text>

        <View style={styles.form}>
          {!configured ? (
            <Text style={styles.notice}>Supabase is not configured. Add keys to .env.</Text>
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            placeholder="Email"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            selectionColor={theme.colors.text}
            style={inputStyle('email')}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            selectionColor={theme.colors.text}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
            style={inputStyle('password')}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <PrimaryButton
          title="Sign in"
          onPress={onSubmit}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.cta}
        />

        <Pressable onPress={() => router.push('/(auth)/signup')} style={styles.secondary}>
          <Text style={styles.secondaryText}>Create account</Text>
        </Pressable>

        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => openLegal('terms')}>
            Terms
          </Text>{' '}
          and{' '}
          <Text style={styles.legalLink} onPress={() => openLegal('privacy')}>
            Privacy Policy
          </Text>
          .
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: theme.space.lg, justifyContent: 'center' },
  brand: { marginBottom: theme.space.lg },
  headline: {
    ...theme.font.display,
    color: theme.colors.text,
    marginBottom: theme.space.sm,
  },
  subhead: {
    ...theme.font.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xl,
  },
  form: { marginBottom: theme.space.md },
  input: {
    height: 48,
    borderRadius: theme.radius.sm,
    borderWidth: theme.hairline,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.space.md,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: theme.space.sm,
  },
  notice: { ...theme.font.caption, color: theme.colors.danger, marginBottom: theme.space.sm },
  error: { ...theme.font.caption, color: theme.colors.danger, marginTop: theme.space.xs },
  cta: { marginBottom: theme.space.sm },
  secondary: { paddingVertical: theme.space.md, alignItems: 'center' },
  secondaryText: { ...theme.font.bodyMedium, color: theme.colors.textSecondary },
  legal: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.space.lg,
    lineHeight: 18,
  },
  legalLink: { color: theme.colors.textSecondary, textDecorationLine: 'underline' },
});
