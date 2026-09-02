import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '@/constants/theme';
import { AchievementGrid } from '@/src/components/AchievementGrid';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { StatPill } from '@/src/components/StatPill';
import { XpBar } from '@/src/components/XpBar';
import { EXERCISE_SOURCE_META } from '@/src/domain/catalog';
import { LEGAL_LINKS, LEGAL_ROUTES } from '@/src/domain/legal';
import { formatCount } from '@/src/domain/progression';
import { useAuth } from '@/src/hooks/useAuth';
import { useDisplayName } from '@/src/hooks/useDisplayName';
import { toProgressStats, useProfileStats } from '@/src/hooks/useSessions';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const { data: stats } = useProfileStats();
  const progress = toProgressStats(stats);
  const displayName = useDisplayName();

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, plans, workout history, and logged sets. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteAccount();
            setDeleting(false);
            if (result.error) Alert.alert('Could not delete account', result.error);
          },
        },
      ]
    );
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
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.xpCard}>
        <XpBar totalXp={progress.totalXp} />
      </View>

      <View style={styles.stats}>
        <StatPill label="Streak" value={progress.currentStreak} showDivider />
        <StatPill label="Best" value={progress.longestStreak} showDivider />
        <StatPill label="Sessions" value={progress.workoutsCompleted} showDivider />
        <StatPill label="Sets" value={formatCount(progress.totalSets)} />
      </View>

      <View style={styles.badges}>
        <AchievementGrid stats={progress} />
      </View>

      <Text style={styles.about}>
        {EXERCISE_SOURCE_META.count} movements from {EXERCISE_SOURCE_META.source}. Training
        systems are style guides inspired by public methodologies.
      </Text>

      <PrimaryButton
        title="Sources"
        variant="ghost"
        onPress={() => router.push('/(app)/sources' as never)}
        style={{ marginBottom: theme.space.sm }}
      />
      <View style={styles.legalRow}>
        <Pressable onPress={() => openLegal('privacy')}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalSep}>·</Text>
        <Pressable onPress={() => openLegal('terms')}>
          <Text style={styles.legalLink}>Terms of Service</Text>
        </Pressable>
      </View>
      <PrimaryButton title="Sign out" variant="ghost" onPress={() => signOut()} style={{ marginBottom: theme.space.sm }} />
      <PrimaryButton
        title="Delete account"
        variant="danger"
        loading={deleting}
        disabled={deleting}
        onPress={confirmDeleteAccount}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flexGrow: 1, padding: theme.space.lg, paddingBottom: theme.space.xl },
  name: { ...theme.font.display, fontSize: 24, color: theme.colors.text, marginBottom: 4 },
  email: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.lg },
  xpCard: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
  },
  badges: { marginBottom: theme.space.lg },
  stats: {
    flexDirection: 'row',
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: theme.space.lg,
    overflow: 'hidden',
  },
  about: {
    ...theme.font.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.lg,
    lineHeight: 22,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  legalLink: { ...theme.font.caption, color: theme.colors.textMuted },
  legalSep: { ...theme.font.caption, color: theme.colors.textMuted },
});
