import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { PlanDayWithExercises } from '@/src/domain/types';

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
        const done =
          (completedUpToIndex ?? 0) > day.day_index ||
          Boolean(completedTodayDayId && day.id === completedTodayDayId);

        return (
          <Pressable
            key={day.id}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Day ${day.day_index + 1}, ${day.name}${done ? ', completed' : ''}`}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && styles.chipPressed,
            ]}
          >
            <View style={styles.chipTop}>
              {done ? (
                <Ionicons name="checkmark-circle" size={13} color={theme.colors.accentDeep} />
              ) : (
                <Text style={styles.dayNum}>{day.day_index + 1}</Text>
              )}
            </View>
            <Text style={styles.dayName} numberOfLines={2}>
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
  row: { gap: 7 },
  chip: {
    width: 64,
    ...theme.card,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 62,
  },
  chipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  chipPressed: { borderColor: theme.colors.accentDim },
  chipTop: { height: 14, justifyContent: 'center', marginBottom: 8 },
  dayNum: { ...theme.font.monoSmall, fontWeight: '500', color: theme.colors.textDim },
  dayName: { ...theme.font.small, fontWeight: '500', fontFamily: theme.fontFamily.medium, color: theme.colors.textSecondary, lineHeight: 15 },
});
