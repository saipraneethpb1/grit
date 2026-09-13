import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { AchievementBadge } from '@/src/components/AchievementBadge';
import {
  ACHIEVEMENTS,
  earnedAchievements,
  type AchievementCategory,
  type ProgressStats,
} from '@/src/domain/progression';

const COLUMNS = 3;
const CATEGORY_ORDER: AchievementCategory[] = ['milestone', 'streak', 'volume', 'level'];

export function AchievementGrid({ stats }: { stats: ProgressStats }) {
  const earnedCount = earnedAchievements(stats).length;
  const ordered = CATEGORY_ORDER.flatMap((category) =>
    ACHIEVEMENTS.filter((a) => a.category === category)
  );
  // Pad the final row so a lone badge does not stretch to the full width.
  const spacers = ordered.length % COLUMNS === 0 ? 0 : COLUMNS - (ordered.length % COLUMNS);

  return (
    <View>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Badges</Text>
        <Text style={styles.count}>
          {earnedCount} / {ACHIEVEMENTS.length}
        </Text>
      </View>
      <View style={styles.grid}>
        {ordered.map((achievement) => (
          <View key={achievement.id} style={styles.cell}>
            <AchievementBadge achievement={achievement} stats={stats} />
          </View>
        ))}
        {Array.from({ length: spacers }, (_, i) => (
          <View key={`spacer-${i}`} style={styles.cell} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kicker: { ...theme.font.kicker, color: theme.colors.textDim },
  count: { ...theme.font.monoSmall, color: theme.colors.textFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31%', flexGrow: 1 },
});
