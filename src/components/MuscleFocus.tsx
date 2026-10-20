import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { anatomyLabel, MUSCLE_GROUPS, MUSCLE_LABELS } from '@/src/domain/muscles';
import type { MuscleGroup } from '@/src/domain/types';
import { AnatomicalBodyMap, ROLE_COLORS, ROLE_TINT } from './AnatomicalBodyMap';
import { themed } from '@/constants/themed';

type Props = { primary: MuscleGroup[]; secondary: MuscleGroup[] };

/**
 * Which muscles an exercise works, on the same anatomical front/back figures
 * as the Progress tab: prime movers in red, secondary muscles in orange.
 * The names are listed too, so the map is never the only way to read it.
 */
export function MuscleFocus({ primary, secondary }: Props) {
  const colors: Partial<Record<MuscleGroup, string>> = {};
  const tint = {} as Record<MuscleGroup, number>;
  for (const m of MUSCLE_GROUPS) {
    const role = primary.includes(m) ? 'primary' : secondary.includes(m) ? 'secondary' : null;
    tint[m] = role ? ROLE_TINT[role] : 0;
    if (role) colors[m] = ROLE_COLORS[role];
  }
  const secondaryOnly = secondary.filter((m) => !primary.includes(m));

  return (
    <View>
      <AnatomicalBodyMap weeklySets={{}} tint={tint} colors={colors} />
      <View style={styles.legend}>
        <View style={styles.key}>
          <View style={styles.swatch}><View style={[StyleSheet.absoluteFill, { backgroundColor: ROLE_COLORS.primary, opacity: ROLE_TINT.primary }]} /></View>
          <Text style={styles.keyLabel}>Primary</Text>
        </View>
        <View style={styles.key}>
          <View style={styles.swatch}><View style={[StyleSheet.absoluteFill, { backgroundColor: ROLE_COLORS.secondary, opacity: ROLE_TINT.secondary }]} /></View>
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

const styles = themed(() => StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  /** Artwork muscle grey under the band's violet tint, as on the map. */
  swatch: { width: 12, height: 12, borderRadius: 3, overflow: 'hidden', backgroundColor: '#c9cbd3' },
  keyLabel: { ...theme.font.small, color: theme.colors.textMuted },
  names: { marginTop: 14 },
  namesLabel: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 4 },
  namesValue: { ...theme.font.caption, color: theme.colors.textSecondary },
  gap: { marginTop: 10 },
}));
