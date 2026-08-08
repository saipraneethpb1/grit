import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';
import { TrainingAudit } from '@/src/components/TrainingAudit';
import { getSplitTemplate } from '@/src/domain/catalog';
import { formatMuscles } from '@/src/domain/muscles';
import { usePlan } from '@/src/hooks/usePlans';

export default function PlanWeekScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, error } = usePlan(id);
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.text} />
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{plan.name}</Text>
      <Text style={styles.meta}>
        {template?.name ?? plan.template_id} · {plan.plan_days.length} days
      </Text>

      <TrainingAudit plan={plan} />

      {plan.plan_days.map((day) => (
        <Pressable
          key={day.id}
          onPress={() =>
            router.push({
              pathname: '/(app)/plan/day/[dayId]',
              params: { dayId: day.id, planId: plan.id },
            })
          }
          style={styles.card}
        >
          <Text style={styles.dayName}>
            Day {day.day_index + 1} · {day.name}
          </Text>
          <Text style={styles.dayMeta}>{formatMuscles(day.focus_muscles)}</Text>
          <Text style={styles.count}>{day.plan_exercises.length} exercises</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: 4 },
  meta: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.md },
  card: {
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.space.md,
  },
  dayName: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 4 },
  dayMeta: { ...theme.font.caption, color: theme.colors.textSecondary, marginBottom: 2 },
  count: { ...theme.font.caption, color: theme.colors.textMuted },
});
