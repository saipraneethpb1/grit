import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_BAND_FLOORS } from '@/src/domain/analytics';
import { anatomyLabel, MUSCLE_GROUPS, MUSCLE_LABELS } from '@/src/domain/muscles';
import type { MuscleGroup } from '@/src/domain/types';
import { BAND_COLORS, MuscleMap } from './MuscleMap';

type Props = { primary: MuscleGroup[]; secondary: MuscleGroup[] };

/**
 * Which muscles an exercise works, on the same front/back map as the Progress
 * tab: prime movers in the brightest ember, secondary muscles a step down.
 * The names are listed too, so the map is never the only way to read it.
 */
export function MuscleFocus({ primary, secondary }: Props) {
  const levels = {} as Record<MuscleGroup, number>;
  for (const m of MUSCLE_GROUPS) {
    levels[m] = primary.includes(m) ? MUSCLE_BAND_FLOORS.target : secondary.includes(m) ? MUSCLE_BAND_FLOORS.building : 0;
  }
  const secondaryOnly = secondary.filter((m) => !primary.includes(m));

  return (
    <View>
      <MuscleMap weeklySets={levels} />
      <View style={styles.legend}>
        <View style={styles.key}>
          <View style={[styles.swatch, { backgroundColor: BAND_COLORS.target }]} />
          <Text style={styles.keyLabel}>Primary</Text>
        </View>
        <View style={styles.key}>
          <View style={[styles.swatch, { backgroundColor: BAND_COLORS.building }]} />
          <Text style={styles.keyLabel}>Secondary</Text>
        </View>
      </View>
      <View style={styles.names}>
        <Text style={styles.namesLabel}>Primary</Text>
        <Text style={styles.namesValue}>
          {primary.map((m) => `${MUSCLE_LABELS[m]} — ${anatomyLabel(m)}`).join('\n') || '—'}
        </Text>
        {secondaryOnly.length ? (
          <>
            <Text style={[styles.namesLabel, styles.gap]}>Secondary</Text>
            <Text style={styles.namesValue}>{secondaryOnly.map((m) => MUSCLE_LABELS[m]).join(', ')}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  keyLabel: { ...theme.font.small, color: theme.colors.textMuted },
  names: { marginTop: 14 },
  namesLabel: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 4 },
  namesValue: { ...theme.font.caption, color: theme.colors.textSecondary },
  gap: { marginTop: 10 },
});
