import { Link, useRouter } from 'expo-router';
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
import { theme } from '@/constants/theme';
import { GritLogo } from '@/src/components/GritLogo';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { LEGAL_LINKS, LEGAL_ROUTES } from '@/src/domain/legal';
import { useAuth } from '@/src/hooks/useAuth';

export default function SignupScreen() {
  const { signUp, configured } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = await signUp(email.trim(), password, displayName.trim() || undefined);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setInfo('Account created. Sign in if you are not redirected automatically.');
    }
  }

  function inputStyle(field: 'name' | 'email' | 'password') {
    return [
      styles.input,
      {
        borderColor: focused === field ? theme.colors.borderStrong : theme.colors.border,
      },
    ];
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
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GritLogo showWordmark size={40} style={styles.brand} />
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Your programs and logs sync to your account.</Text>

        {!configured ? (
          <Text style={styles.notice}>Supabase is not configured. See README.</Text>
        ) : null}

        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="words"
          textContentType="name"
          selectionColor={theme.colors.text}
          style={inputStyle('name')}
        />
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
          autoComplete="new-password"
          textContentType="newPassword"
          selectionColor={theme.colors.text}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          style={inputStyle('password')}
        />

        {error ? <Text style={styles.feedback}>{error}</Text> : null}
        {info ? <Text style={[styles.feedback, { color: theme.colors.success }]}>{info}</Text> : null}

        <PrimaryButton
          title="Create account"
          onPress={onSubmit}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.cta}
        />

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </Link>

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
  scroll: { flexGrow: 1, padding: theme.space.lg, justifyContent: 'center' },
  brand: { marginBottom: theme.space.lg },
  title: { ...theme.font.display, color: theme.colors.text, marginBottom: theme.space.sm },
  subtitle: { ...theme.font.body, color: theme.colors.textSecondary, marginBottom: theme.space.xl },
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
  feedback: { ...theme.font.caption, color: theme.colors.danger, marginBottom: theme.space.sm },
  cta: { marginTop: theme.space.sm, marginBottom: theme.space.md },
  link: { paddingVertical: theme.space.sm },
  linkText: { ...theme.font.bodyMedium, color: theme.colors.textSecondary, textAlign: 'center' },
  legal: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.space.lg,
    lineHeight: 18,
  },
  legalLink: { color: theme.colors.textSecondary, textDecorationLine: 'underline' },
});
