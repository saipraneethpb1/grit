import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import { analyzeTrainingPlan } from '@/src/domain/trainingAnalysis';
import type { GeneratedPlan, WorkoutPlanWithDays } from '@/src/domain/types';

export function TrainingAudit({ plan }: { plan: GeneratedPlan | WorkoutPlanWithDays }) {
  const audit = analyzeTrainingPlan(plan);
  const complete = audit.missingDirectCoverage.length === 0;

  const dayCount = audit.days.length;
  // Time per session is the number someone actually plans around; the weekly
  // total says little about whether a given evening fits.
  const perSession = dayCount ? Math.round(audit.estimatedMinutes / dayCount) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Coverage {audit.coveragePercent}%</Text>
      <Text style={styles.metrics}>
        {dayCount} {dayCount === 1 ? 'day' : 'days'} a week · {audit.totalSets} sets ·
        ~{perSession} min a session
      </Text>
      <Text style={[styles.status, { color: complete ? theme.colors.textSecondary : theme.colors.orange }]}>
        {complete
          ? 'All focus muscles have direct work.'
          : `Missing: ${audit.missingDirectCoverage.map((m) => MUSCLE_LABELS[m]).join(', ')}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.md,
    backgroundColor: theme.colors.card,
  },
  title: { ...theme.font.bodyMedium, color: theme.colors.text },
  metrics: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: 4 },
  status: { ...theme.font.caption, marginTop: theme.space.sm, lineHeight: 18 },
});
