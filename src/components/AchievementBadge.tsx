import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import {
  formatCount,
  isEarned,
  type Achievement,
  type ProgressStats,
} from '@/src/domain/progression';

type Props = {
  achievement: Achievement;
  stats: ProgressStats;
  /** Celebration styling for a badge earned seconds ago. */
  highlight?: boolean;
};

export function AchievementBadge({ achievement, stats, highlight }: Props) {
  const earned = isEarned(achievement, stats);
  const progress = achievement.measure(stats);

  return (
    <View
      style={[styles.card, earned && styles.earned, highlight && styles.highlight]}
      accessibilityRole="image"
      accessibilityLabel={`${achievement.name}. ${achievement.description}. ${
        earned ? 'Earned' : 'Locked'
      }`}
    >
      {/* A locked badge keeps its icon but loses its colour, so the trophy case
          reads as a ladder to climb rather than a wall of question marks. */}
      <Text style={[styles.icon, !earned && styles.iconLocked]}>{achievement.icon}</Text>
      <Text style={[styles.name, !earned && styles.dim]} numberOfLines={2}>
        {achievement.name}
      </Text>
      <Text style={styles.meta} numberOfLines={2}>
        {earned
          ? achievement.description
          : `${formatCount(Math.min(progress, achievement.threshold))} / ${formatCount(
              achievement.threshold
            )}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 96,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.space.sm,
    alignItems: 'center',
    gap: 2,
  },
  earned: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.cardHover,
  },
  highlight: {
    borderColor: theme.colors.tint,
    backgroundColor: theme.colors.tintSoft,
  },
  icon: { fontSize: 26, lineHeight: 32 },
  iconLocked: { opacity: 0.28 },
  name: {
    ...theme.font.label,
    color: theme.colors.text,
    textAlign: 'center',
  },
  dim: { color: theme.colors.textMuted },
  meta: {
    ...theme.font.caption,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
