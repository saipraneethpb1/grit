import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { levelFromXp } from '@/src/domain/progression';

type Props = {
  totalXp: number;
  /** Drops the caption row for tight spots. */
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
          {level.xpToNextLevel.toLocaleString()} XP to level {level.level + 1}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  levelChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: theme.hairline,
    borderColor: theme.colors.accentDim,
  },
  levelChipText: {
    ...theme.font.mono,
    fontSize: 11,
    letterSpacing: 0.7,
    color: theme.colors.accentText,
  },
  xpTotal: { ...theme.font.monoSmall, fontSize: 11.5, color: theme.colors.textDim },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    ...theme.shadow.glow,
  },
  caption: { ...theme.font.small, color: theme.colors.textDim, marginTop: -2 },
});
