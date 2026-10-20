import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '@/constants/theme';
import { useSyncNow } from '@/src/hooks/useWorkoutOutbox';
import { useAppearance, type AppearancePreference } from '@/src/hooks/useAppearance';

const APPEARANCE_LABELS: Record<AppearancePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' };
import { queuedCount } from '@/src/lib/workoutStore';
import { useTabBarSpace } from '@/src/hooks/useTabBarSpace';
import { BrandKicker } from '@/src/components/BrandKicker';
import { AchievementGrid } from '@/src/components/AchievementGrid';
import { FadeRule } from '@/src/components/FadeRule';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SectionLabel } from '@/src/components/SectionLabel';
import { StatPill, StatRow } from '@/src/components/StatPill';
import { XpBar } from '@/src/components/XpBar';
import { LEGAL_LINKS, LEGAL_ROUTES } from '@/src/domain/legal';
import { formatCount } from '@/src/domain/progression';
import type { WorkoutSessionWithSets } from '@/src/domain/types';
import { useAuth } from '@/src/hooks/useAuth';
import { useDisplayName } from '@/src/hooks/useDisplayName';
import { toProgressStats, useProfileStats, useRecentSessions } from '@/src/hooks/useSessions';
import { themed } from '@/constants/themed';

const CHART_WEEKS = 8;
const BEST_COUNT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Enough sessions to fill eight weeks of a six-day split. */
const SESSION_WINDOW = 60;

function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Monday-based weeks; getDay() is 0 on Sunday.
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

function weeklyVolume(sessions: WorkoutSessionWithSets[]) {
  const thisWeek = startOfWeek(new Date());
  const buckets = Array.from({ length: CHART_WEEKS }, () => 0);
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const week = startOfWeek(new Date(s.completed_at));
    const back = Math.round((thisWeek.getTime() - week.getTime()) / (7 * DAY_MS));
    if (back < 0 || back >= CHART_WEEKS) continue;
    let volume = 0;
    for (const set of s.session_sets) {
      if (set.completed) volume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
    }
    buckets[CHART_WEEKS - 1 - back] += volume;
  }
  return buckets.map((volume, i) => {
    const start = new Date(thisWeek.getTime() - (CHART_WEEKS - 1 - i) * 7 * DAY_MS);
    return { volume, label: `${start.getDate()}/${start.getMonth() + 1}` };
  });
}

/** Heaviest set per exercise, ordered by how recently that best was set. */
function recentBests(sessions: WorkoutSessionWithSets[]) {
  const best = new Map<string, { weight: number; reps: number; rank: number }>();
  sessions.forEach((s, rank) => {
    for (const set of s.session_sets) {
      if (!set.completed || set.weight == null || set.reps == null) continue;
      const weight = Number(set.weight);
      const reps = Number(set.reps);
      if (!weight) continue;
      const key = set.exercise_name || set.exercise_id;
      const cur = best.get(key);
      if (!cur || weight > cur.weight || (weight === cur.weight && reps > cur.reps)) {
        best.set(key, { weight, reps, rank });
      }
    }
  });
  return [...best.entries()]
    .sort((a, b) => a[1].rank - b[1].rank)
    .slice(0, BEST_COUNT)
    .map(([name, v]) => ({ name, value: `${v.weight} × ${v.reps}` }));
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const { data: stats } = useProfileStats();
  const { data: sessions } = useRecentSessions(SESSION_WINDOW);
  const progress = toProgressStats(stats);
  const displayName = useDisplayName();
  const syncNow = useSyncNow();
  const { preference, setPreference } = useAppearance();

  const chart = useMemo(() => weeklyVolume(sessions ?? []), [sessions]);
  const bests = useMemo(() => recentBests(sessions ?? []), [sessions]);
  const chartMax = Math.max(...chart.map((c) => c.volume), 0);
  const hasSessions = (sessions?.length ?? 0) > 0;

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

  /** A workout still waiting to sync would be deleted with the rest of this account's local data. */
  async function confirmSignOut() {
    if (!user) return signOut();
    await syncNow();
    const pending = await queuedCount(user.id);
    if (!pending) return signOut();
    Alert.alert(
      'Workout not synced yet',
      `${pending === 1 ? 'One workout is' : `${pending} workouts are`} still saved only on this phone. Signing out deletes ${pending === 1 ? 'it' : 'them'}. Connect to the internet and open the app to sync first.`,
      [
        { text: 'Stay signed in', style: 'cancel' },
        { text: 'Sign out anyway', style: 'destructive', onPress: () => void signOut() },
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
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: theme.space.xl + tabSpace }]}
      showsVerticalScrollIndicator={false}
    >
      <BrandKicker style={styles.kicker}>Profile</BrandKicker>
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.xpCard}>
        <XpBar totalXp={progress.totalXp} />
      </View>

      <View style={styles.stats}>
        <StatRow>
          <StatPill label="Streak" value={progress.currentStreak} showDivider />
          <StatPill label="Sessions" value={progress.workoutsCompleted} showDivider />
          <StatPill label="Sets" value={formatCount(progress.totalSets)} showDivider />
          <StatPill label="Best" value={progress.longestStreak} />
        </StatRow>
      </View>

      <SectionLabel>Eight-week volume</SectionLabel>
      {hasSessions ? (
        <View style={styles.chart} accessibilityLabel="Weekly training volume for the last eight weeks">
          {chart.map((c, i) => {
            const last = i === chart.length - 1;
            const h = chartMax > 0 ? Math.max(2, Math.round((c.volume / chartMax) * 100)) : 2;
            return (
              <View key={c.label} style={styles.chartCol}>
                <View style={styles.chartBarWrap}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${h}%`, backgroundColor: last ? theme.colors.accent : theme.colors.borderStrong },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{c.label}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyNote}>Finish a workout to start the chart.</Text>
      )}

      <FadeRule style={styles.rule} />

      <SectionLabel>Recent bests</SectionLabel>
      {bests.length ? (
        <View style={styles.bests}>
          {bests.map((b) => (
            <View key={b.name} style={styles.bestRow}>
              <Text style={styles.bestName} numberOfLines={1}>{b.name}</Text>
              <Text style={styles.bestValue}>{b.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyNote}>Log a weighted set and it shows up here.</Text>
      )}

      <View style={styles.badges}>
        <AchievementGrid stats={progress} />
      </View>

      <View style={styles.appearance}>
        <Text style={styles.appearanceLabel}>Appearance</Text>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {(['system', 'light', 'dark'] as const).map((p) => {
            const on = preference === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPreference(p)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Appearance: ${APPEARANCE_LABELS[p]}`}
                style={[styles.segmentItem, on && styles.segmentItemOn]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{APPEARANCE_LABELS[p]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.legalRow}>
        <Pressable onPress={() => openLegal('privacy')} accessibilityRole="link">
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalSep}>·</Text>
        <Pressable onPress={() => openLegal('terms')} accessibilityRole="link">
          <Text style={styles.legalLink}>Terms of Service</Text>
        </Pressable>
      </View>
      <PrimaryButton title="Sign out" variant="ghost" onPress={() => void confirmSignOut()} style={styles.gap} />
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

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl },
  kicker: { marginBottom: 18 },
  name: { ...theme.font.display, color: theme.colors.text },
  email: { ...theme.font.caption, color: theme.colors.textDim, marginTop: 5, marginBottom: 18 },
  xpCard: { ...theme.card, paddingHorizontal: 22, paddingVertical: 24, marginBottom: 14 },
  stats: { marginBottom: 18 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 124, paddingHorizontal: 2 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end', gap: 6 },
  chartBarWrap: { flex: 1, justifyContent: 'flex-end' },
  chartBar: { borderTopLeftRadius: 6, borderTopRightRadius: 6, width: '100%' },
  chartLabel: { ...theme.font.monoSmall, fontSize: 9.5, lineHeight: 12, color: theme.colors.textFaint, textAlign: 'center' },
  emptyNote: { ...theme.font.caption, color: theme.colors.textFaint },
  rule: { marginTop: 16, marginBottom: 14 },

  bests: { marginBottom: 18 },
  bestRow: {
    paddingVertical: 12,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  bestName: { ...theme.font.body, color: theme.colors.textSecondary, flex: 1 },
  bestValue: { ...theme.font.mono, color: theme.colors.accentText },

  badges: { marginTop: 18, marginBottom: 20 },
  gap: { marginBottom: 9 },
  appearance: { marginBottom: theme.space.lg },
  appearanceLabel: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 10 },
  segment: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, borderWidth: theme.hairline, borderColor: theme.colors.border, padding: 3 },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full },
  segmentItemOn: { backgroundColor: theme.colors.accentSoft },
  segmentText: { ...theme.font.bodyMedium, fontSize: 13, color: theme.colors.textMuted },
  segmentTextOn: { color: theme.colors.accentText },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.space.sm,
    marginBottom: 14,
    marginTop: 4,
  },
  legalLink: { ...theme.font.small, color: theme.colors.textDim },
  legalSep: { ...theme.font.small, color: theme.colors.textFaint },
}));
