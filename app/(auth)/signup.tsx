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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { GritLogo } from '@/src/components/GritLogo';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { LEGAL_LINKS, LEGAL_ROUTES } from '@/src/domain/legal';
import { useAuth } from '@/src/hooks/useAuth';

type Field = 'name' | 'email' | 'password';

export default function SignupScreen() {
  const { signUp, configured } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (loading || !configured) return;
    setError(null);
    setInfo(null);
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, displayName.trim() || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setInfo('Check your email to confirm your account, then sign in.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function inputStyle(field: Field) {
    return [styles.input, focused === field && styles.inputFocused];
  }

  function openLegal(kind: 'terms' | 'privacy') {
    const url = LEGAL_LINKS[kind];
    if (url) {
      WebBrowser.openBrowserAsync(url);
      return;
    }
    router.push(LEGAL_ROUTES[kind]);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + theme.space.lg, paddingBottom: insets.bottom + theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GritLogo showWordmark size={36} style={styles.brand} />
        <Text style={styles.kicker}>New account</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Your programs and logs sync to it.</Text>

        {!configured ? (
          <Text style={styles.notice}>Sign-up is temporarily unavailable. Please try again later.</Text>
        ) : null}

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          accessibilityLabel="Name"
          maxLength={80}
          placeholder="What should we call you?"
          placeholderTextColor={theme.colors.textFaint}
          autoCapitalize="words"
          textContentType="name"
          selectionColor={theme.colors.accent}
          style={inputStyle('name')}
        />
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
          placeholder="At least 12 characters"
          placeholderTextColor={theme.colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          selectionColor={theme.colors.accent}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          style={inputStyle('password')}
        />

        {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.feedback}>{error}</Text> : null}
        {info ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, styles.info]}>{info}</Text> : null}

        <PrimaryButton
          title="Create account"
          onPress={onSubmit}
          loading={loading}
          disabled={!configured || loading || !email || !password}
          style={styles.cta}
        />

        <PrimaryButton title="Already have an account? Sign in" variant="link" onPress={() => router.push('/(auth)/login')} />

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
  title: { ...theme.font.hero, color: theme.colors.text, marginBottom: 10 },
  subtitle: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: 26 },
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
  feedback: { ...theme.font.caption, color: theme.colors.danger, marginBottom: 10, marginTop: -4 },
  info: { color: theme.colors.accentText },
  cta: { minHeight: 50, marginTop: 4, marginBottom: 4 },
  legal: {
    ...theme.font.small,
    color: theme.colors.textFaint,
    textAlign: 'center',
    marginTop: theme.space.lg,
  },
  legalLink: { color: theme.colors.textMuted, textDecorationLine: 'underline' },
});
