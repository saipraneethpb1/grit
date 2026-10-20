import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { countLabel } from '@/src/domain/progression';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import { analyzeTrainingPlan } from '@/src/domain/trainingAnalysis';
import { trainingAge, weeklyVolume, type MuscleVolume } from '@/src/domain/coach';
import { useProfileStats } from '@/src/hooks/useSessions';
import type { GeneratedPlan, WorkoutPlanWithDays } from '@/src/domain/types';
import { themed } from '@/constants/themed';

const STATUS_COLOR = themed((): Record<MuscleVolume['status'], string> => ({
  low: theme.colors.warning,
  productive: theme.colors.accent,
  high: theme.colors.danger,
}));

export function TrainingAudit({ plan }: { plan: GeneratedPlan | WorkoutPlanWithDays }) {
  const audit = analyzeTrainingPlan(plan);
  const { data: profile } = useProfileStats();
  const age = trainingAge(profile?.workouts_completed ?? 0);
  const planDays = 'days' in plan ? plan.days : plan.plan_days;
  const focus = [...new Set(planDays.flatMap((d) => d.focus_muscles))];
  const volume = weeklyVolume(planDays, age, focus).sort((a, b) => b.sets - a.sets);
  const scale = Math.max(...volume.map((v) => Math.max(v.sets, v.range[1])), 1);
  const productive = volume.filter((v) => v.status === 'productive').length;
  const twice = volume.filter((v) => v.frequency >= 2).length;
  const off = volume.filter((v) => v.status !== 'productive');
  const complete = audit.missingDirectCoverage.length === 0;

  const dayCount = audit.days.length;
  // Time per session is the number someone actually plans around; the weekly
  // total says little about whether a given evening fits.
  const perSession = dayCount ? Math.round(audit.estimatedMinutes / dayCount) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Coverage · {audit.coveragePercent}%</Text>
      <Text style={styles.metrics}>
        {countLabel(dayCount, 'day')} a week · {countLabel(audit.totalSets, 'set')} · ~{perSession} min a session
      </Text>
      <Text style={[styles.status, !complete && styles.warn]}>
        {complete
          ? 'Every focus muscle has direct work.'
          : `Missing: ${audit.missingDirectCoverage.map((m) => MUSCLE_LABELS[m]).join(', ')}`}
      </Text>

      <View style={styles.science}>
        <Text style={styles.kicker}>Weekly volume · {age}</Text>
        <Text style={styles.metrics}>
          {productive}/{volume.length} muscles in their productive range · {twice}/{volume.length} trained twice a week
        </Text>
        <View style={styles.bars}>
          {volume.map((v) => (
            <View key={v.muscle} style={styles.barRow} accessibilityLabel={`${MUSCLE_LABELS[v.muscle]}: ${v.sets} sets a week, ${v.frequency} days. Productive range ${v.range[0]} to ${v.range[1]}.`}>
              <Text style={styles.barName} numberOfLines={1}>{MUSCLE_LABELS[v.muscle]}</Text>
              <View style={styles.track}>
                {/* The productive band, then the planned sets on top. */}
                <View style={[styles.band, { left: `${(v.range[0] / scale) * 100}%`, width: `${((v.range[1] - v.range[0]) / scale) * 100}%` }]} />
                <View style={[styles.fill, { width: `${Math.min(100, (v.sets / scale) * 100)}%`, backgroundColor: STATUS_COLOR[v.status] }]} />
              </View>
              <Text style={styles.barValue}>{Math.round(v.sets * 10) / 10}</Text>
              <Text style={styles.barFreq}>{v.frequency}×</Text>
            </View>
          ))}
        </View>
        <Text style={styles.status}>
          {off.length
            ? off.map((v) => `${MUSCLE_LABELS[v.muscle]} ${v.status === 'low' ? 'below' : 'above'} ${v.status === 'low' ? v.range[0] : v.range[1]} sets`).join(' · ')
            : 'Every muscle sits in the range most lifters grow on.'}
          {' '}Shaded band: productive weekly sets for your training age. Secondary muscles count half.
        </Text>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
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
  science: { marginTop: 14, paddingTop: 12, borderTopWidth: theme.hairline, borderTopColor: theme.colors.borderTint },
  bars: { marginTop: 10, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barName: { ...theme.font.small, color: theme.colors.textMuted, width: 78 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.track, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, backgroundColor: theme.colors.accentBand },
  fill: { position: 'absolute', left: 0, top: 2, height: 4, borderRadius: 2 },
  barValue: { ...theme.font.monoSmall, color: theme.colors.textSecondary, width: 30, textAlign: 'right' },
  barFreq: { ...theme.font.monoSmall, color: theme.colors.textDim, width: 20, textAlign: 'right' },
}));
