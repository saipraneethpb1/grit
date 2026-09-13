import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import { analyzeTrainingDay, analyzeTrainingPlan } from '@/src/domain/trainingAnalysis';
import type { MuscleGroup, WorkoutPlanWithDays } from '@/src/domain/types';

/** "Weekly volume by region" — effective sets per muscle across the rotation. */
export function VolumeByRegion({ plan }: { plan: WorkoutPlanWithDays }) {
  const audit = analyzeTrainingPlan(plan);
  const totals = new Map<MuscleGroup, number>();
  for (const day of audit.days) {
    for (const [muscle, sets] of Object.entries(day.effectiveSets)) {
      totals.set(muscle as MuscleGroup, (totals.get(muscle as MuscleGroup) ?? 0) + (sets ?? 0));
    }
  }
  const rows = [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, sets: Math.round(sets) }))
    .filter((r) => r.sets > 0)
    .sort((a, b) => b.sets - a.sets);
  const max = rows[0]?.sets ?? 1;

  if (!rows.length) return null;

  return (
    <View style={styles.volumeCard}>
      <Text style={styles.volumeKicker}>Weekly volume by region</Text>
      <View style={styles.bars}>
        {rows.map((r) => (
          <View key={r.muscle} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{MUSCLE_LABELS[r.muscle]}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((r.sets / max) * 100)}%` }]} />
            </View>
            <Text style={styles.barValue}>{r.sets} sets</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type DayListProps = {
  plan: WorkoutPlanWithDays;
  /** Days with a lower index than this count as done this cycle. */
  completedUpToIndex?: number;
  completedTodayDayId?: string | null;
  onSelect: (dayId: string) => void;
};

/** Numbered day rows with a completion mark. */
export function ProgramDayList({ plan, completedUpToIndex = 0, completedTodayDayId, onSelect }: DayListProps) {
  const days = [...plan.plan_days].sort((a, b) => a.day_index - b.day_index);
  return (
    <View style={styles.days}>
      {days.map((day) => {
        const audit = analyzeTrainingDay(day);
        const done = day.day_index < completedUpToIndex || day.id === completedTodayDayId;
        return (
          <Pressable
            key={day.id}
            onPress={() => onSelect(day.id)}
            accessibilityRole="button"
            accessibilityLabel={`Day ${day.day_index + 1}, ${day.name}${done ? ', completed' : ''}`}
            style={({ pressed }) => [styles.dayRow, pressed && styles.dayRowPressed]}
          >
            <View style={styles.dayNum}>
              <Text style={styles.dayNumText}>{day.day_index + 1}</Text>
            </View>
            <View style={styles.dayBody}>
              <Text style={styles.dayName} numberOfLines={1}>{day.name}</Text>
              <Text style={styles.dayMeta}>
                {day.plan_exercises.length} exercises · {audit.totalSets} sets
              </Text>
            </View>
            {done ? (
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.accentDeep} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  volumeCard: {
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderTint,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 18,
  },
  volumeKicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 9 },
  bars: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { ...theme.font.small, color: theme.colors.textMuted, width: 88 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.colors.track, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: theme.colors.accentDeep },
  barValue: { ...theme.font.monoSmall, fontSize: 10.5, fontWeight: '500', color: theme.colors.textDim, width: 48, textAlign: 'right' },

  days: { gap: 8 },
  dayRow: { ...theme.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayRowPressed: { borderColor: theme.colors.accentDim },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: { ...theme.font.monoSmall, fontSize: 11.5, fontWeight: '500', color: theme.colors.textMuted },
  dayBody: { flex: 1, minWidth: 0 },
  dayName: { ...theme.font.bodyMedium, color: theme.colors.text },
  dayMeta: { ...theme.font.small, color: theme.colors.textDim, marginTop: 2 },
});
