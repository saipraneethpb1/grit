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

/** Square tile: icon, name, and either the unlock rule or progress toward it. */
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
      <Text style={[styles.name, earned && styles.nameEarned]} numberOfLines={2}>
        {achievement.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {earned
          ? 'Earned'
          : `${formatCount(Math.min(progress, achievement.threshold))} / ${formatCount(
              achievement.threshold
            )}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...theme.card,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  earned: { borderColor: theme.colors.borderStrong },
  highlight: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  icon: { fontSize: 19, lineHeight: 24 },
  iconLocked: { opacity: 0.3 },
  name: { ...theme.font.small, fontSize: 9.5, lineHeight: 12, color: theme.colors.textMuted, textAlign: 'center' },
  nameEarned: { color: theme.colors.textSecondary },
  meta: { ...theme.font.monoSmall, fontSize: 9, lineHeight: 11, color: theme.colors.textFaint },
});
