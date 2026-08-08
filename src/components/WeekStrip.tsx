import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { PlanDayWithExercises } from '@/src/domain/types';
import { CompletionBadge } from './CompletionBadge';

type Props = {
  days: PlanDayWithExercises[];
  currentIndex: number;
  /** Days before the current rotation index count as completed this cycle. */
  completedUpToIndex?: number;
  /** Day completed in the most recent session today. */
  completedTodayDayId?: string | null;
  onSelect: (day: PlanDayWithExercises) => void;
};

export function WeekStrip({
  days,
  currentIndex,
  completedUpToIndex,
  completedTodayDayId,
  onSelect,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {days.map((day) => {
        const active = day.day_index === currentIndex;
        const done = (completedUpToIndex ?? 0) > day.day_index;
        const doneToday = Boolean(completedTodayDayId && day.id === completedTodayDayId);

        return (
          <Pressable
            key={day.id}
            onPress={() => onSelect(day)}
            style={[
              styles.chip,
              active && styles.chipActive,
              done && !active && styles.chipDone,
              doneToday && styles.chipDoneToday,
            ]}
          >
            <View style={styles.chipTop}>
              {done ? (
                <CompletionBadge size="sm" />
              ) : (
                <Text style={[styles.dayNum, active && styles.dayNumActive]}>{day.day_index + 1}</Text>
              )}
            </View>
            <Text
              style={[styles.dayName, active && styles.dayNameActive, done && !active && styles.dayNameDone]}
              numberOfLines={2}
            >
              {day.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: theme.space.sm },
  chip: {
    width: 76,
    borderRadius: theme.radius.sm,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.sm,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  chipActive: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  },
  chipDone: {
    borderColor: theme.colors.successBorder,
    backgroundColor: theme.colors.successSoft,
  },
  chipDoneToday: {
    borderColor: theme.colors.success,
  },
  chipTop: {
    minHeight: 16,
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNum: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  dayNumActive: {
    color: theme.colors.black,
  },
  dayName: {
    ...theme.font.caption,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 16,
  },
  dayNameActive: {
    color: theme.colors.black,
  },
  dayNameDone: {
    color: theme.colors.success,
  },
});
