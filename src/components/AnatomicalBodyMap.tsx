import { Fragment } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Image, Path } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { muscleBand, type MuscleBand } from '@/src/domain/analytics';
import {
  BODY_MAP_BACK,
  BODY_MAP_BACKGROUND,
  BODY_MAP_CROP,
  BODY_MAP_FRONT,
  BODY_MAP_SILHOUETTES,
  BODY_MAP_SIZE,
  type BodyRegion,
  type BodyView,
} from '@/src/domain/bodyMap';
import type { MuscleGroup } from '@/src/domain/types';
import { themed } from '@/constants/themed';

const ARTWORK = require('../../assets/anatomy/bodymap/bodymap.webp');

/**
 * Sequential violet ramp for weekly sets in bars and charts, validated against
 * the card surface (one hue, monotone lightness, every step clears the
 * surface). Untrained muscles sit outside the ramp in the neutral track grey.
 */
export const BAND_COLORS = themed((): Record<MuscleBand, string> => ({
  none: theme.colors.track,
  low: theme.colors.bandLow,
  building: theme.colors.bandBuilding,
  target: theme.colors.bandTarget,
}));

/**
 * Violet tint strength per band. The artwork's own fibre shading shows through,
 * so a lightly trained muscle reads as a wash and a well-trained one as solid.
 */
export const BAND_TINT: Record<MuscleBand, number> = { none: 0, low: 0.3, building: 0.48, target: 0.66 };

type Props = {
  /** Average weekly sets per muscle. */
  weeklySets: Partial<Record<MuscleGroup, number>>;
  selected?: MuscleGroup | null;
  /** Omit for a display-only map (exercise guides). */
  onSelect?: (muscle: MuscleGroup) => void;
  /** Overrides the tint strength of specific muscles. */
  tint?: Partial<Record<MuscleGroup, number>>;
  /** Overrides the tint colour of specific muscles, e.g. prime movers vs. secondary in a guide. */
  colors?: Partial<Record<MuscleGroup, string>>;
};

/** Exercise-guide colours: red for prime movers, orange for supporting muscles. */
export const ROLE_COLORS = { primary: '#ff3347', secondary: '#ff9a1f' } as const;
export const ROLE_TINT = { primary: 0.76, secondary: 0.64 } as const;

/**
 * react-native-svg's web adapter cannot take a press handler per shape: it turns
 * `onPress` into responder props that React DOM rejects. So on web each region
 * carries an id and one click handler on the wrapper reads the muscle back from
 * the target; native keeps a plain `onPress` per region.
 */
const WEB = Platform.OS === 'web';
const ID_PREFIX = 'ryvora-body';
const muscleFromTarget = (target: unknown): MuscleGroup | null => {
  const id = (target as { id?: unknown } | null)?.id;
  if (typeof id !== 'string' || !id.startsWith(`${ID_PREFIX}-`)) return null;
  return id.split('-')[2] as MuscleGroup;
};

/** Anatomical front and back figures tinted violet by weekly sets. Tap a muscle to select it. */
export function AnatomicalBodyMap({ weeklySets, selected, onSelect, tint, colors }: Props) {
  const opacity = (m: MuscleGroup) => tint?.[m] ?? BAND_TINT[muscleBand(weeklySets[m] ?? 0)];

  const region = (r: BodyRegion, key: string, transform?: string) => {
    const on = selected === r.muscle;
    return (
      <Path
        key={key}
        d={r.d}
        transform={transform}
        fill={colors?.[r.muscle] ?? theme.colors.accent}
        fillOpacity={opacity(r.muscle)}
        stroke={on ? theme.colors.text : 'none'}
        strokeWidth={on ? 7 : 0}
        {...(onSelect
          ? WEB
            ? { id: `${ID_PREFIX}-${r.muscle}-${key}` }
            : { onPress: () => onSelect(r.muscle) }
          : null)}
      />
    );
  };
  const view = (v: BodyView, name: string) => {
    const mirror = `translate(${2 * v.axis} 0) scale(-1 1)`;
    return (
      <Fragment key={name}>
        {v.paired.map((r, i) => region(r, `${name}l${i}`))}
        {v.paired.map((r, i) => region(r, `${name}r${i}`, mirror))}
        {v.center.map((r, i) => region(r, `${name}c${i}`))}
      </Fragment>
    );
  };

  return (
    <View
      accessibilityLabel="Anatomical body map of muscles trained. The list below gives the same values."
      {...(WEB && onSelect
        ? {
            onClick: (e: { target: unknown }) => {
              const muscle = muscleFromTarget(e.target);
              if (muscle) onSelect(muscle);
            },
          }
        : null)}
    >
      <View style={styles.frame}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`${BODY_MAP_CROP.x} ${BODY_MAP_CROP.y} ${BODY_MAP_CROP.width} ${BODY_MAP_CROP.height}`}
        >
          <Defs>
            <ClipPath id="ryvora-body-silhouette">
              {BODY_MAP_SILHOUETTES.map((d) => <Path key={d.slice(0, 24)} d={d} />)}
            </ClipPath>
          </Defs>
          <Image href={ARTWORK} x={0} y={0} width={BODY_MAP_SIZE.width} height={BODY_MAP_SIZE.height} />
          <G clipPath="url(#ryvora-body-silhouette)">
            {view(BODY_MAP_FRONT, 'f')}
            {view(BODY_MAP_BACK, 'b')}
          </G>
        </Svg>
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>Front</Text>
        <Text style={styles.label}>Back</Text>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  frame: { width: '100%', aspectRatio: BODY_MAP_CROP.width / BODY_MAP_CROP.height, backgroundColor: BODY_MAP_BACKGROUND, borderRadius: theme.radius.md, overflow: 'hidden' },
  labels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  label: { ...theme.font.kicker, color: theme.colors.textFaint },
}));
