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
      <Text style={styles.kicker}>Coverage · {audit.coveragePercent}%</Text>
      <Text style={styles.metrics}>
        {dayCount} {dayCount === 1 ? 'day' : 'days'} a week · {audit.totalSets} sets · ~{perSession} min a session
      </Text>
      <Text style={[styles.status, !complete && styles.warn]}>
        {complete
          ? 'Every focus muscle has direct work.'
          : `Missing: ${audit.missingDirectCoverage.map((m) => MUSCLE_LABELS[m]).join(', ')}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderTint,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: theme.space.md,
  },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 7 },
  metrics: { ...theme.font.body, color: theme.colors.textSecondary },
  status: { ...theme.font.small, color: theme.colors.textDim, marginTop: 4 },
  warn: { color: theme.colors.danger },
});
