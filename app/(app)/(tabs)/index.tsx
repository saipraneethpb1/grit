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
import { EmptyState } from '@/src/components/EmptyState';
import { GritLogo } from '@/src/components/GritLogo';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SectionLabel } from '@/src/components/SectionLabel';
import { StatPill } from '@/src/components/StatPill';
import { WeekStrip } from '@/src/components/WeekStrip';
import { WorkoutDoneBanner } from '@/src/components/WorkoutDoneBanner';
import { XpBar } from '@/src/components/XpBar';
import { getSplitTemplate } from '@/src/domain/catalog';
import {
  getMethodology,
  QUICK_START_METHODOLOGY_ID,
} from '@/src/domain/methodologies';
import { formatMuscles } from '@/src/domain/muscles';
import { useDisplayName } from '@/src/hooks/useDisplayName';
import { useActivePlan } from '@/src/hooks/usePlans';
import {
  toProgressStats,
  useProfileStats,
  useRecentSessions,
} from '@/src/hooks/useSessions';

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
  if (isSameCalendarDay(d, new Date())) return 'Today';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  const todaySetsLogged = todaySession
    ? todaySession.session_sets.filter((s) => s.completed).length
    : 0;

  const todayAlreadyDone = Boolean(
    todaySession && today && todaySession.plan_day_id === today.id
  );

  const footerPad = Math.max(insets.bottom, theme.space.sm);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.text} />
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
        contentContainerStyle={[styles.emptyWrap, { paddingTop: insets.top + theme.space.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <GritLogo showWordmark size={40} style={styles.emptyLogo} />
        <Text style={styles.greeting}>Hi, {name}</Text>
        <EmptyState
          title="No program yet"
          message="Pick a training system and split, or start with the beginner program and change it later."
          action={
            <View style={styles.emptyActions}>
              {quickStart ? (
                <PrimaryButton
                  title="Start a beginner program"
                  onPress={() =>
                    router.push(
                      `/(app)/splits/preview?templateId=${quickStart.defaultSplitId}&methodologyId=${quickStart.id}` as never
                    )
                  }
                />
              ) : null}
              <PrimaryButton
                title="Browse all systems"
                variant="ghost"
                onPress={() => router.push('/(app)/splits')}
              />
            </View>
          }
        />
      </ScrollView>
    );
  }

  const template = getSplitTemplate(plan.template_id);
  const recentSessions = (recent ?? []).slice(0, 3);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: theme.space.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.textSecondary}
            colors={[theme.colors.text]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <View style={styles.header}>
          <GritLogo size={32} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{name}</Text>
            <Text style={styles.programMeta}>
              {template?.name ?? 'Program'} · Day {dayIndex + 1} of {sortedDays.length}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/profile')}
            style={styles.profileBtn}
            accessibilityLabel="Open profile"
          >
            <Text style={styles.profileInitial}>{name.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>

        {todaySession ? (
          <WorkoutDoneBanner dayName={todaySession.day_name} setsLogged={todaySetsLogged} />
        ) : null}

        <Pressable
          style={styles.xpCard}
          onPress={() => router.push('/(app)/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile to see badges"
        >
          <XpBar totalXp={progress.totalXp} />
        </Pressable>

        <View style={styles.statsRow}>
          <StatPill label="Streak" value={progress.currentStreak} showDivider />
          <StatPill label="Best" value={progress.longestStreak} showDivider />
          <StatPill label="Sessions" value={progress.workoutsCompleted} showDivider />
          <StatPill label="Days" value={sortedDays.length} />
        </View>

        <View style={styles.section}>
          <SectionLabel>Your program</SectionLabel>
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

        <View style={styles.section}>
          <SectionLabel>{todayAlreadyDone ? 'Up next' : 'Today'}</SectionLabel>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(app)/plan/day/[dayId]',
                params: { dayId: today.id, planId: plan.id },
              })
            }
            style={styles.todayCard}
          >
            <Text style={styles.workoutTitle}>{today.name}</Text>
            <Text style={styles.workoutMeta}>{formatMuscles(today.focus_muscles)}</Text>
            <Text style={styles.workoutCount}>
              {today.plan_exercises.length} exercises
            </Text>

            {today.plan_exercises.slice(0, 3).map((pe) => (
              <View key={pe.id} style={styles.exerciseLine}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {pe.exercise.name}
                </Text>
                <Text style={styles.exerciseSets}>
                  {pe.target_sets}×{pe.target_reps_min}–{pe.target_reps_max}
                </Text>
              </View>
            ))}
            {today.plan_exercises.length > 3 ? (
              <Text style={styles.more}>+{today.plan_exercises.length - 3} more</Text>
            ) : null}
            <Text style={styles.viewDetails}>View full day →</Text>
          </Pressable>
        </View>

        {recentSessions.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionLabel style={styles.sectionLabelInline}>Recent</SectionLabel>
              <Pressable onPress={() => router.push('/(app)/(tabs)/history')} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {recentSessions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push('/(app)/(tabs)/history')}
                style={styles.sessionRow}
              >
                <Text style={styles.sessionName}>{s.day_name}</Text>
                <Text style={styles.sessionMeta}>
                  {formatSessionDate(s.completed_at)} ·{' '}
                  {s.session_sets.filter((x) => x.completed).length} sets
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable onPress={() => router.push('/(app)/splits')} style={styles.changeProgram}>
          <Text style={styles.changeProgramText}>Change program</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        {todayAlreadyDone ? (
          <PrimaryButton
            title="View today's log"
            variant="ghost"
            onPress={() => router.push('/(app)/(tabs)/history')}
          />
        ) : (
          <PrimaryButton
            title="Start workout"
            onPress={() =>
              router.push(`/(app)/workout/${today.id}?planId=${plan.id}` as never)
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyWrap: { flexGrow: 1, padding: theme.space.lg, justifyContent: 'center' },
  emptyLogo: { marginBottom: theme.space.lg },
  emptyActions: { width: '100%', gap: theme.space.sm },
  content: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  headerText: { flex: 1 },
  greeting: { ...theme.font.display, fontSize: 24, color: theme.colors.text },
  programMeta: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: 4 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { ...theme.font.bodyMedium, color: theme.colors.text },
  xpCard: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: theme.space.lg,
    overflow: 'hidden',
  },
  section: {
    marginBottom: theme.space.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
  sectionLabelInline: { marginBottom: 0 },
  seeAll: { ...theme.font.caption, color: theme.colors.textMuted },
  todayCard: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    backgroundColor: theme.colors.card,
  },
  workoutTitle: { ...theme.font.title, fontSize: 18, color: theme.colors.text, marginBottom: 2 },
  workoutMeta: { ...theme.font.caption, color: theme.colors.textSecondary, marginBottom: 2 },
  workoutCount: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.sm },
  exerciseLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.space.sm,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    gap: theme.space.sm,
  },
  exerciseName: { ...theme.font.body, color: theme.colors.text, flex: 1 },
  exerciseSets: { ...theme.font.caption, color: theme.colors.textMuted },
  more: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: theme.space.xs },
  viewDetails: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space.sm,
  },
  sessionRow: {
    paddingVertical: theme.space.md,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.border,
  },
  sessionName: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 2 },
  sessionMeta: { ...theme.font.caption, color: theme.colors.textMuted },
  changeProgram: { paddingVertical: theme.space.md, alignItems: 'center' },
  changeProgramText: { ...theme.font.caption, color: theme.colors.textMuted },
  footer: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
});
