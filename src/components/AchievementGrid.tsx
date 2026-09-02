import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { AchievementBadge } from '@/src/components/AchievementBadge';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORY_LABELS,
  earnedAchievements,
  type Achievement,
  type AchievementCategory,
  type ProgressStats,
} from '@/src/domain/progression';

const COLUMNS = 3;

const CATEGORY_ORDER: AchievementCategory[] = ['milestone', 'streak', 'volume', 'level'];

function Row({ items, stats }: { items: Achievement[]; stats: ProgressStats }) {
  // Pad the final row so a lone badge does not stretch to the full width.
  const spacers = items.length % COLUMNS === 0 ? 0 : COLUMNS - (items.length % COLUMNS);
  return (
    <View style={styles.grid}>
      {items.map((achievement) => (
        <AchievementBadge key={achievement.id} achievement={achievement} stats={stats} />
      ))}
      {Array.from({ length: spacers }, (_, i) => (
        <View key={`spacer-${i}`} style={styles.spacer} />
      ))}
    </View>
  );
}

export function AchievementGrid({ stats }: { stats: ProgressStats }) {
  const earnedCount = earnedAchievements(stats).length;

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.count}>
          {earnedCount} / {ACHIEVEMENTS.length}
        </Text>
      </View>

      {CATEGORY_ORDER.map((category) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === category);
        if (!items.length) return null;
        return (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionLabel}>{ACHIEVEMENT_CATEGORY_LABELS[category]}</Text>
            <Row items={items} stats={stats} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.space.md },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { ...theme.font.title, color: theme.colors.text },
  count: { ...theme.font.caption, color: theme.colors.textMuted },
  section: { gap: theme.space.sm },
  sectionLabel: {
    ...theme.font.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  spacer: { flex: 1, minWidth: 96 },
});
