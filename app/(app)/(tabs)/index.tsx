import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { formatTarget } from '@/src/components/DayWorkoutList';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeRule } from '@/src/components/FadeRule';
import { GritLogo } from '@/src/components/GritLogo';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SectionLabel } from '@/src/components/SectionLabel';
import { StatPill, StatRow } from '@/src/components/StatPill';
import { WeekStrip } from '@/src/components/WeekStrip';
import { WorkoutDoneBanner } from '@/src/components/WorkoutDoneBanner';
import { getSplitTemplate } from '@/src/domain/catalog';
import {
  getMethodology,
  QUICK_START_METHODOLOGY_ID,
} from '@/src/domain/methodologies';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import { analyzeTrainingDay } from '@/src/domain/trainingAnalysis';
import type { MuscleGroup } from '@/src/domain/types';
import { useDisplayName } from '@/src/hooks/useDisplayName';
import { useActivePlan } from '@/src/hooks/usePlans';
import {
  toProgressStats,
  useProfileStats,
  useRecentSessions,
} from '@/src/hooks/useSessions';

const PREVIEW_COUNT = 3;
const EMPHASIS_COUNT = 4;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSessionDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  if (isSameCalendarDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const name = useDisplayName();
  const { data: plan, isLoading, error, refetch, isRefetching } = useActivePlan();
  const { data: stats, refetch: refetchStats } = useProfileStats();
  const { data: recent, refetch: refetchRecent } = useRecentSessions(5);

  const dayIndex = stats?.current_day_index ?? 0;
  const progress = toProgressStats(stats);
  const quickStart = getMethodology(QUICK_START_METHODOLOGY_ID);

  const onRefresh = useCallback(() => {
    void Promise.all([refetch(), refetchStats(), refetchRecent()]);
  }, [refetch, refetchStats, refetchRecent]);

  const sortedDays = useMemo(() => {
    if (!plan?.plan_days?.length) return [];
    return [...plan.plan_days].sort((a, b) => a.day_index - b.day_index);
  }, [plan]);

  const today = useMemo(() => {
    if (!sortedDays.length) return null;
    return sortedDays[dayIndex % sortedDays.length] ?? sortedDays[0];
  }, [sortedDays, dayIndex]);

  const todaySession = useMemo(() => {
    const now = new Date();
    return (recent ?? []).find((s) => {
      if (!s.completed_at) return false;
      return isSameCalendarDay(new Date(s.completed_at), now);
    });
  }, [recent]);

  // Share of the day's effective sets per muscle — the "what this session
  // actually loads" bars under the day title.
  const emphasis = useMemo(() => {
    if (!today) return [];
    const audit = analyzeTrainingDay(today);
    const total = Object.values(audit.effectiveSets).reduce((n, v) => n + (v ?? 0), 0);
    if (!total) return [];
    return (Object.entries(audit.effectiveSets) as [MuscleGroup, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, EMPHASIS_COUNT)
      .map(([muscle, sets]) => ({ muscle, pct: Math.round((sets / total) * 100) }));
  }, [today]);

  const todaySetsLogged = todaySession
    ? todaySession.session_sets.filter((s) => s.completed).length
    : 0;

  const todayAlreadyDone = Boolean(
    todaySession && today && todaySession.plan_day_id === today.id
  );

  const topPad = insets.top + 18;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: theme.space.lg }]}>
        <EmptyState
          title="Couldn't load plan"
          message={error instanceof Error ? error.message : 'Something went wrong.'}
          action={<PrimaryButton title="Retry" onPress={() => refetch()} />}
        />
      </View>
    );
  }

  if (!plan || !today) {
    return (
      <ScrollView
        contentContainerStyle={[styles.emptyWrap, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        <GritLogo showWordmark size={36} style={styles.emptyLogo} />
        <Text style={styles.kicker}>{todayLabel()}</Text>
        <Text style={styles.greeting}>Ready, {name}</Text>
        <EmptyState
          title="No program yet"
          message="Pick a training style and a weekly split, or write your own days. The week builds itself from there."
          action={
            <View style={styles.emptyActions}>
              <PrimaryButton
                title="Describe your week"
                onPress={() => router.push('/(app)/splits/describe' as never)}
              />
              {quickStart ? (
                <PrimaryButton
                  title="Start a beginner program"
                  variant="ghost"
                  onPress={() =>
                    router.push(
                      `/(app)/splits/preview?templateId=${quickStart.defaultSplitId}&methodologyId=${quickStart.id}` as never
                    )
                  }
                />
              ) : null}
              <PrimaryButton
                title="Browse training styles"
                variant="ghost"
                onPress={() => router.push('/(app)/splits')}
              />
              <PrimaryButton
                title="Build a custom program"
                variant="ghost"
                onPress={() => router.push('/(app)/splits/custom')}
              />
            </View>
          }
        />
      </ScrollView>
    );
  }

  const template = getSplitTemplate(plan.template_id);
  const programName = plan.template_id === 'custom' ? plan.name : template?.name ?? 'Program';
  const audit = analyzeTrainingDay(today);
  const recentSessions = (recent ?? []).slice(0, 3);
  const openToday = () =>
    router.push({
      pathname: '/(app)/plan/day/[dayId]',
      params: { dayId: today.id, planId: plan.id },
    });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: topPad }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{todayLabel()}</Text>
          <Text style={styles.greeting}>Ready, {name}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/(tabs)/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>

      <View style={styles.week}>
        <WeekStrip
          days={sortedDays}
          currentIndex={today.day_index}
          completedUpToIndex={dayIndex}
          completedTodayDayId={todaySession?.plan_day_id}
          onSelect={(d) =>
            router.push({
              pathname: '/(app)/plan/day/[dayId]',
              params: { dayId: d.id, planId: plan.id },
            })
          }
        />
      </View>

      {todaySession ? (
        <WorkoutDoneBanner dayName={todaySession.day_name} setsLogged={todaySetsLogged} />
      ) : null}

      <View style={styles.todayCard}>
        <View style={styles.cardKickerRow}>
          <Ionicons name="archive" size={12} color={theme.colors.accent} />
          <Text style={styles.cardKicker} numberOfLines={1}>
            {programName} · Day {today.day_index + 1} of {sortedDays.length}
          </Text>
        </View>
        <Text style={styles.dayName}>{today.name}</Text>
        <Text style={styles.dayMeta}>
          {today.plan_exercises.length} exercises · {audit.totalSets} sets · ~{audit.estimatedMinutes} min
        </Text>

        {emphasis.length ? (
          <View style={styles.emphasis}>
            {emphasis.map((m) => (
              <View key={m.muscle} style={styles.emphasisRow}>
                <Text style={styles.emphasisLabel} numberOfLines={1}>{MUSCLE_LABELS[m.muscle]}</Text>
                <View style={styles.emphasisTrack}>
                  <View style={[styles.emphasisFill, { width: `${m.pct}%` }]} />
                </View>
                <Text style={styles.emphasisPct}>{m.pct}%</Text>
              </View>
            ))}
          </View>
        ) : null}

        <FadeRule style={styles.cardRule} />

        <View style={styles.preview}>
          {today.plan_exercises.slice(0, PREVIEW_COUNT).map((pe) => (
            <View key={pe.id} style={styles.previewRow}>
              <Text style={styles.previewName} numberOfLines={1}>{pe.exercise.name}</Text>
              <Text style={styles.previewTarget}>
                {formatTarget(pe.target_sets, pe.target_reps_min, pe.target_reps_max)}
              </Text>
            </View>
          ))}
          {today.plan_exercises.length > PREVIEW_COUNT ? (
            <Text style={styles.more}>+{today.plan_exercises.length - PREVIEW_COUNT} more</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {todayAlreadyDone ? (
            <PrimaryButton
              title="View log"
              icon={<Ionicons name="checkmark-circle" size={15} color={theme.colors.accentText} />}
              onPress={() => router.push('/(app)/history')}
              style={styles.startBtn}
            />
          ) : (
            <PrimaryButton
              title="Start"
              icon={<Ionicons name="play" size={14} color={theme.colors.accentText} />}
              onPress={() => router.push(`/(app)/workout/${today.id}?planId=${plan.id}` as never)}
              style={styles.startBtn}
            />
          )}
          <PrimaryButton title="Details" variant="ghost" onPress={openToday} style={styles.detailsBtn} />
        </View>
      </View>

      <View style={styles.stats}>
        <StatRow>
          <StatPill label="Streak" value={progress.currentStreak} showDivider />
          <StatPill label="Best" value={progress.longestStreak} showDivider />
          <StatPill label="Sessions" value={progress.workoutsCompleted} showDivider />
          <StatPill label="Days" value={sortedDays.length} />
        </StatRow>
      </View>

      {recentSessions.length > 0 ? (
        <View>
          <View style={styles.sectionHeader}>
            <SectionLabel style={styles.sectionLabelInline}>Recent</SectionLabel>
            <Pressable onPress={() => router.push('/(app)/history')} hitSlop={8} accessibilityRole="link">
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {recentSessions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push('/(app)/history')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.sessionRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.sessionName} numberOfLines={1}>{s.day_name}</Text>
              <Text style={styles.sessionMeta}>
                {formatSessionDate(s.completed_at)} · {s.session_sets.filter((x) => x.completed).length} sets
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyWrap: { flexGrow: 1, paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl },
  emptyLogo: { marginBottom: theme.space.lg },
  emptyActions: { width: '100%', gap: 9 },
  content: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.lg },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerText: { flex: 1 },
  kicker: { ...theme.font.kicker, color: theme.colors.textDim },
  greeting: { ...theme.font.display, fontSize: 24, lineHeight: 29, color: theme.colors.text, marginTop: 5 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: { borderColor: theme.colors.accentDim },
  avatarText: { ...theme.font.bodyMedium, color: theme.colors.textSecondary },

  week: { marginBottom: 18 },

  todayCard: { ...theme.card, paddingHorizontal: 15, paddingVertical: 16, marginBottom: 14 },
  cardKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  cardKicker: { ...theme.font.kicker, color: theme.colors.accentDeep, flex: 1 },
  dayName: { ...theme.font.title, color: theme.colors.text },
  dayMeta: { ...theme.font.caption, color: theme.colors.textDim, marginTop: 4 },
  emphasis: { marginTop: 15, gap: 8 },
  emphasisRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emphasisLabel: { ...theme.font.small, color: theme.colors.textMuted, width: 96 },
  emphasisTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.colors.track, overflow: 'hidden' },
  emphasisFill: { height: 5, borderRadius: 3, backgroundColor: theme.colors.accent },
  emphasisPct: { ...theme.font.monoSmall, fontSize: 10.5, fontWeight: '500', color: theme.colors.textDim, width: 30, textAlign: 'right' },
  cardRule: { marginTop: 15, marginBottom: 13 },
  preview: { gap: 9 },
  previewRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  previewName: { ...theme.font.body, color: theme.colors.textSecondary, flex: 1 },
  previewTarget: { ...theme.font.monoSmall, fontSize: 11.5, fontWeight: '500', color: theme.colors.textDim },
  more: { ...theme.font.small, fontSize: 12, color: theme.colors.textFaint },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  startBtn: { flex: 1 },
  detailsBtn: { width: 96, paddingHorizontal: 8 },

  stats: { marginBottom: 20 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionLabelInline: { marginBottom: 8 },
  seeAll: { ...theme.font.small, color: theme.colors.textFaint, marginBottom: 8 },
  sessionRow: {
    paddingVertical: 13,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  sessionName: { ...theme.font.body, color: theme.colors.textSecondary, flex: 1 },
  sessionMeta: { ...theme.font.monoSmall, fontSize: 11.5, color: theme.colors.textDim },
});
