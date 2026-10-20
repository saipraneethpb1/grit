import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { MUSCLE_BAND_FLOORS, RADAR_AXES, radarPoints, radarScale } from '@/src/domain/analytics';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import type { MuscleGroup } from '@/src/domain/types';

type Props = {
  /** Average weekly sets per muscle for the selected window. */
  current: Record<MuscleGroup, number>;
  /** The window before it, drawn as an outline for comparison. */
  previous?: Record<MuscleGroup, number>;
  selected?: MuscleGroup | null;
};

const RINGS = 3;
/** Room beside the web for axis labels, which run horizontally. */
const SIDE_GAP = 70;
/** Room above and below, where labels are short. */
const END_GAP = 30;

/**
 * Balance web: one axis per muscle group, weekly sets plotted outward. The
 * dashed ring marks the 10-set guideline; the outline is the previous window.
 */
export function MuscleRadar({ current, previous, selected }: Props) {
  const [width, setWidth] = useState(0);
  const size = Math.min(width, 380);
  const scale = previous ? radarScale(current, previous) : radarScale(current);
  const radius = Math.max(0, size / 2 - SIDE_GAP);
  const height = 2 * (radius + END_GAP);
  const center = { x: size / 2, y: height / 2 };
  const pts = radarPoints(current, scale, radius, center);
  const prev = previous ? radarPoints(previous, scale, radius, center) : null;
  const outer = radarPoints(Object.fromEntries(RADAR_AXES.map((m) => [m, scale])) as Record<MuscleGroup, number>, scale, radius, center);
  const toPoly = (p: { x: number; y: number }[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  const ring = (fraction: number) => toPoly(outer.map((p) => ({ x: center.x + (p.x - center.x) * fraction, y: center.y + (p.y - center.y) * fraction })));
  const guide = MUSCLE_BAND_FLOORS.target / scale;
  const font = Platform.OS === 'web' ? 'Inter_500Medium, sans-serif' : theme.fontFamily.medium;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel="Training balance web of weekly sets per muscle group. The list below gives the same values."
    >
      {size > 0 ? (
        <Svg width={size} height={height}>
          {Array.from({ length: RINGS }, (_, i) => (
            <Polygon key={i} points={ring((i + 1) / RINGS)} fill="none" stroke={theme.colors.border} strokeWidth={1} />
          ))}
          {outer.map((p) => (
            <Line key={p.muscle} x1={center.x} y1={center.y} x2={p.x} y2={p.y} stroke={theme.colors.divider} strokeWidth={1} />
          ))}
          <Polygon points={ring(guide)} fill="none" stroke={theme.colors.accentDim} strokeWidth={1} strokeDasharray="3 4" />
          {prev ? (
            <Polygon points={toPoly(prev)} fill="none" stroke={theme.colors.textFaint} strokeWidth={1.2} strokeDasharray="4 3" />
          ) : null}
          <Polygon points={toPoly(pts)} fill={theme.colors.accent} fillOpacity={0.22} stroke={theme.colors.accent} strokeWidth={2} strokeLinejoin="round" />
          {pts.map((p) => (
            <Circle key={p.muscle} cx={p.x} cy={p.y} r={p.muscle === selected ? 5 : 3}
              fill={p.muscle === selected ? theme.colors.text : theme.colors.accent} />
          ))}
          <G>
            {outer.map((p) => {
              const dx = p.x - center.x;
              const dy = p.y - center.y;
              const len = Math.hypot(dx, dy) || 1;
              const lx = center.x + (dx / len) * (radius + 16);
              const ly = center.y + (dy / len) * (radius + 16);
              const anchor = Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end';
              const on = p.muscle === selected;
              return (
                <SvgText key={p.muscle} x={lx} y={ly + 4} fontSize={10.5} fontFamily={font}
                  fill={on ? theme.colors.text : theme.colors.textMuted} textAnchor={anchor}>
                  {MUSCLE_LABELS[p.muscle]}
                </SvgText>
              );
            })}
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
});
