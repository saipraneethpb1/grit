import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { ACTIVITY_LEVEL_SETS, type DayActivity } from '@/src/domain/analytics';
import { countLabel, formatCount } from '@/src/domain/progression';
import { themed } from '@/constants/themed';

type Props = { grid: DayActivity[][] };

/** Rest, then four steps of violet; each step is distinguishable from its neighbours and the card. */
export const HEAT_COLORS = themed(() => [theme.colors.track, theme.colors.heat1, theme.colors.heat2, theme.colors.heat3, theme.colors.heat4]);

const CELL = 13;
const GAP = 3;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

function dayLabel(d: DayActivity): string {
  const date = d.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (d.future) return date;
  if (!d.workouts) return `${date} · Rest day`;
  return `${date} · ${countLabel(d.workouts, 'workout')} · ${countLabel(d.sets, 'set')}${d.volume > 0 ? ` · ${formatCount(d.volume)} kg` : ''}`;
}

/**
 * GitHub-style training calendar: one column per week, Monday at the top,
 * shaded by completed sets that day. Tap a day for its totals. The newest week
 * sits on the right and the strip opens scrolled to it.
 */
export function TrainingHeatmap({ grid }: Props) {
  const today = grid.flat().filter((d) => !d.future).at(-1) ?? null;
  const [picked, setPicked] = useState<DayActivity | null>(today);

  const months = grid.map((week, i) => {
    const first = week[0].date;
    const prev = i > 0 ? grid[i - 1][0].date : null;
    return !prev || prev.getMonth() !== first.getMonth() ? first.toLocaleDateString(undefined, { month: 'short' }) : '';
  });

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.dayCol}>
          <View style={styles.monthSpacer} />
          {DAY_LABELS.map((l, i) => (
            <Text key={i} style={styles.dayText}>{l}</Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weeks}
          ref={(ref) => { ref?.scrollToEnd({ animated: false }); }}
        >
          {grid.map((week, w) => (
            <View key={week[0].date.toISOString()} style={styles.week}>
              <Text style={styles.monthText}>{months[w]}</Text>
              {week.map((d) => {
                const on = picked?.date.getTime() === d.date.getTime();
                return (
                  <Pressable
                    key={d.date.toISOString()}
                    onPress={() => !d.future && setPicked(d)}
                    disabled={d.future}
                    accessibilityRole="button"
                    accessibilityLabel={dayLabel(d)}
                    hitSlop={1}
                    style={[
                      styles.cell,
                      d.future ? styles.future : { backgroundColor: HEAT_COLORS[d.level] },
                      on && styles.cellOn,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.readout} numberOfLines={2}>{picked ? dayLabel(picked) : 'Tap a day'}</Text>
        <View style={styles.scale} accessibilityLabel={`Shading: rest, then up to ${ACTIVITY_LEVEL_SETS[1]}, ${ACTIVITY_LEVEL_SETS[2]}, ${ACTIVITY_LEVEL_SETS[3]} and more sets`}>
          <Text style={styles.scaleText}>Less</Text>
          {HEAT_COLORS.map((c) => <View key={c} style={[styles.swatch, { backgroundColor: c }]} />)}
          <Text style={styles.scaleText}>More</Text>
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row' },
  dayCol: { marginRight: 6, gap: GAP },
  monthSpacer: { height: 14 },
  dayText: { ...theme.font.small, fontSize: 9, lineHeight: CELL, height: CELL, color: theme.colors.textFaint },
  weeks: { gap: GAP, paddingRight: 24 },
  week: { gap: GAP, width: CELL },
  /** Wider than its column on purpose: the next few columns have no label, so the name runs over them. */
  monthText: { ...theme.font.small, fontSize: 9, lineHeight: 14, height: 14, width: 36, color: theme.colors.textDim },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  future: { backgroundColor: 'transparent', borderWidth: theme.hairline, borderColor: theme.colors.divider },
  cellOn: { borderWidth: 1.5, borderColor: theme.colors.text },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  readout: { ...theme.font.caption, color: theme.colors.textSecondary, flex: 1 },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scaleText: { ...theme.font.small, fontSize: 9.5, color: theme.colors.textFaint, marginHorizontal: 2 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
}));
