import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { ProgramDayList, VolumeByRegion } from '@/src/components/ProgramOverview';
import { TrainingAudit } from '@/src/components/TrainingAudit';
import { getSplitTemplate } from '@/src/domain/catalog';
import { usePlan } from '@/src/hooks/usePlans';
import { useProfileStats } from '@/src/hooks/useSessions';

export default function PlanWeekScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, error } = usePlan(id);
  const { data: stats } = useProfileStats();
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Plan not found'}
        </Text>
      </View>
    );
  }

  const template = getSplitTemplate(plan.template_id);
  const completedUpTo = plan.is_active ? stats?.current_day_index ?? 0 : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{plan.name}</Text>
      <Text style={styles.meta}>
        {plan.template_id === 'custom' ? 'Custom program' : template?.name ?? 'Program'} · {plan.plan_days.length}-day rotation
      </Text>

      <TrainingAudit plan={plan} />
      <VolumeByRegion plan={plan} />

      <ProgramDayList
        plan={plan}
        completedUpToIndex={completedUpTo}
        onSelect={(dayId) =>
          router.push({ pathname: '/(app)/plan/day/[dayId]', params: { dayId, planId: plan.id } })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  title: { ...theme.font.display, color: theme.colors.text },
  meta: { ...theme.font.caption, color: theme.colors.textDim, marginTop: 6, marginBottom: 18 },
});
