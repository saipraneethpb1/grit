import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { levelFromXp } from '@/src/domain/progression';

type Props = {
  totalXp: number;
  /** Drops the caption row for tight spots like the home header. */
  compact?: boolean;
};

export function XpBar({ totalXp, compact }: Props) {
  const level = levelFromXp(totalXp);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.levelChip}>
          <Text style={styles.levelChipText}>LVL {level.level}</Text>
        </View>
        {!compact ? (
          <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP</Text>
        ) : null}
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: level.xpForLevel,
          now: level.xpIntoLevel,
          text: `Level ${level.level}, ${level.xpToNextLevel} XP to level ${level.level + 1}`,
        }}
      >
        {/* Percentage width rather than onLayout maths: the bar is the only
            thing in its row, so it can size itself off the parent. */}
        <View style={[styles.fill, { width: `${Math.round(level.progress * 100)}%` }]} />
      </View>

      {!compact ? (
        <Text style={styles.caption}>
          {level.xpIntoLevel.toLocaleString()} / {level.xpForLevel.toLocaleString()} ·{' '}
          {level.xpToNextLevel.toLocaleString()} XP to level {level.level + 1}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.space.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  levelChip: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tintSoft,
    borderWidth: theme.hairline,
    borderColor: theme.colors.tintDim,
  },
  levelChipText: {
    ...theme.font.label,
    fontSize: 11,
    color: theme.colors.tint,
    letterSpacing: 0.6,
  },
  xpTotal: { ...theme.font.caption, color: theme.colors.textMuted },
  track: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.chip,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint,
  },
  caption: { ...theme.font.caption, color: theme.colors.textMuted },
});
