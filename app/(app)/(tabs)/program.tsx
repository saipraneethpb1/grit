import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { EmptyState } from '@/src/components/EmptyState';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ProgramDayList, VolumeByRegion } from '@/src/components/ProgramOverview';
import { getSplitTemplate } from '@/src/domain/catalog';
import { getMethodology, QUICK_START_METHODOLOGY_ID } from '@/src/domain/methodologies';
import { useActivePlan } from '@/src/hooks/usePlans';
import { useProfileStats, useRecentSessions } from '@/src/hooks/useSessions';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ProgramScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: plan, isLoading, error, refetch, isRefetching } = useActivePlan();
  const { data: stats, refetch: refetchStats } = useProfileStats();
  const { data: recent } = useRecentSessions(5);
  const quickStart = getMethodology(QUICK_START_METHODOLOGY_ID);

  const onRefresh = useCallback(() => {
    void Promise.all([refetch(), refetchStats()]);
  }, [refetch, refetchStats]);

  const completedTodayDayId = useMemo(() => {
    const now = new Date();
    return (recent ?? []).find(
      (s) => s.completed_at && isSameCalendarDay(new Date(s.completed_at), now)
    )?.plan_day_id;
  }, [recent]);

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
          title="Couldn't load program"
          message={error instanceof Error ? error.message : 'Something went wrong.'}
          action={<PrimaryButton title="Retry" onPress={() => refetch()} />}
        />
      </View>
    );
  }

  if (!plan || !plan.plan_days.length) {
    return (
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad }]}>
        <Text style={styles.title}>Program</Text>
        <Text style={styles.meta}>Nothing active yet</Text>
        <EmptyState
          title="Pick a program"
          message="Choose a training style and a weekly split, or write your own days."
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
              <PrimaryButton title="Browse training styles" variant="ghost" onPress={() => router.push('/(app)/splits')} />
              <PrimaryButton title="Build a custom program" variant="ghost" onPress={() => router.push('/(app)/splits/custom')} />
            </View>
          }
        />
      </ScrollView>
    );
  }

  const template = getSplitTemplate(plan.template_id);
  const programName = plan.template_id === 'custom' ? plan.name : template?.name ?? plan.name;
  const week = Math.max(1, Math.floor((Date.now() - new Date(plan.created_at).getTime()) / WEEK_MS) + 1);
  const dayIndex = stats?.current_day_index ?? 0;

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
      <Text style={styles.title}>Program</Text>
      <Text style={styles.meta}>
        {programName} · {plan.plan_days.length}-day rotation · week {week}
      </Text>

      <VolumeByRegion plan={plan} />

      <ProgramDayList
        plan={plan}
        completedUpToIndex={dayIndex}
        completedTodayDayId={completedTodayDayId}
        onSelect={(dayId) =>
          router.push({ pathname: '/(app)/plan/day/[dayId]', params: { dayId, planId: plan.id } })
        }
      />

      <PrimaryButton
        title="Change program"
        variant="ghost"
        onPress={() => router.push('/(app)/splits')}
        style={styles.browse}
      />
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
  content: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl },
  title: { ...theme.font.display, color: theme.colors.text },
  meta: { ...theme.font.caption, color: theme.colors.textDim, marginTop: 6, marginBottom: 18 },
  emptyActions: { gap: 9 },
  browse: { marginTop: 16 },
});
