import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
    if (loading || !configured) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) setError(result.error);
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
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
    return [styles.input, focused === field && styles.inputFocused];
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
        <GritLogo showWordmark size={36} style={styles.brand} />
        <Text style={styles.kicker}>Welcome back</Text>
        <Text style={styles.headline}>Train with intention.</Text>
        <Text style={styles.subhead}>Sign in to pick up your program and your log.</Text>

        <View style={styles.form}>
          {!configured ? (
            <Text style={styles.notice}>Sign-in is temporarily unavailable. Please try again later.</Text>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            accessibilityLabel="Email"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.textFaint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            selectionColor={theme.colors.accent}
            style={inputStyle('email')}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            accessibilityLabel="Password"
            placeholder="••••••••••••"
            placeholderTextColor={theme.colors.textFaint}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            selectionColor={theme.colors.accent}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
            style={inputStyle('password')}
          />

          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        </View>

        <PrimaryButton
          title="Sign in"
          onPress={onSubmit}
          loading={loading}
          disabled={!configured || loading || !email || !password}
          style={styles.cta}
        />

        <PrimaryButton title="Create account" variant="ghost" onPress={() => router.push('/(auth)/signup')} />

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
  scroll: { flexGrow: 1, paddingHorizontal: 22, justifyContent: 'center' },
  brand: { marginBottom: 30 },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 12 },
  headline: { ...theme.font.hero, color: theme.colors.text, marginBottom: 10 },
  subhead: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: 26 },
  form: { marginBottom: 14 },
  label: { ...theme.font.small, fontSize: 12, color: theme.colors.textMuted, marginBottom: 5 },
  input: {
    minHeight: 44,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...theme.font.body,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
  },
  inputFocused: { borderColor: theme.colors.accent },
  notice: { ...theme.font.caption, color: theme.colors.danger, marginBottom: 10 },
  error: { ...theme.font.caption, color: theme.colors.danger, marginTop: -4 },
  cta: { minHeight: 50, marginBottom: 9 },
  legal: {
    ...theme.font.small,
    color: theme.colors.textFaint,
    textAlign: 'center',
    marginTop: theme.space.lg,
  },
  legalLink: { color: theme.colors.textMuted, textDecorationLine: 'underline' },
});
