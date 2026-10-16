import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { muscleBand, type MuscleBand } from '@/src/domain/analytics';
import type { MuscleGroup } from '@/src/domain/types';

/**
 * Sequential lime ramp for weekly sets, validated against the card surface
 * (one hue, monotone lightness, every step clears the surface). Untrained
 * muscles sit outside the ramp in the neutral track grey.
 */
export const BAND_COLORS: Record<MuscleBand, string> = {
  none: theme.colors.track,
  low: '#4a6330',
  building: '#86ad4f',
  target: theme.colors.accent,
};

const SILHOUETTE = '#242c26';
const VIEW_W = 120;
const VIEW_H = 250;

type Shape = { muscle: MuscleGroup; node: (props: ShapeProps) => ReactNode };
type ShapeProps = { fill: string; stroke: string; strokeWidth: number; onPress: () => void };

const ellipse = (cx: number, cy: number, rx: number, ry: number) => (p: ShapeProps) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...p} />
);
const path = (d: string) => (p: ShapeProps) => <Path d={d} {...p} />;
const rect = (x: number, y: number, w: number, h: number, r: number) => (p: ShapeProps) => (
  <Rect x={x} y={y} width={w} height={h} rx={r} {...p} />
);

/*
 * Original, deliberately stylised artwork — simple shapes, not traced from any
 * anatomical atlas. Paired muscles are drawn once on the figure's left and
 * mirrored; `center` shapes sit on the midline.
 */
const FRONT: { paired: Shape[]; center: Shape[] } = {
  paired: [
    { muscle: 'shoulders', node: ellipse(38, 50, 9, 8) },
    { muscle: 'chest', node: path('M59 46 L45 47 Q40 56 44 68 Q52 74 59 70 Z') },
    { muscle: 'biceps', node: ellipse(33, 75, 5.5, 13) },
    { muscle: 'forearms', node: ellipse(28, 111, 5, 15) },
    { muscle: 'core', node: path('M45 75 L50 77 L50 110 L46 106 Z') },
    { muscle: 'quads', node: path('M43 136 Q40 160 45 186 L57 186 Q60 160 58 138 Z') },
    { muscle: 'calves', node: ellipse(47, 212, 4, 14) },
  ],
  center: [{ muscle: 'core', node: rect(51, 74, 18, 40, 5) }],
};

const BACK: { paired: Shape[]; center: Shape[] } = {
  paired: [
    { muscle: 'back', node: path('M47 56 Q40 74 48 98 L58 94 L58 76 L52 60 Z') },
    { muscle: 'shoulders', node: ellipse(38, 50, 9, 8) },
    { muscle: 'triceps', node: ellipse(33, 75, 5.5, 13) },
    { muscle: 'forearms', node: ellipse(28, 111, 5, 15) },
    { muscle: 'glutes', node: ellipse(51, 126, 9, 10) },
    { muscle: 'hamstrings', node: path('M43 140 Q41 162 45 186 L57 186 Q59 162 58 142 Z') },
    { muscle: 'calves', node: ellipse(50, 208, 7, 15) },
  ],
  center: [
    { muscle: 'back', node: rect(53, 92, 14, 20, 4) },
    { muscle: 'traps', node: path('M60 33 L46 46 L60 76 L74 46 Z') },
  ],
};

/** Body outline shared by both views. */
function Silhouette() {
  const half = (
    <>
      <Rect x={26} y={44} width={14} height={50} rx={7} fill={SILHOUETTE} />
      <Rect x={22} y={92} width={12} height={40} rx={6} fill={SILHOUETTE} />
      <Ellipse cx={27} cy={138} rx={6} ry={8} fill={SILHOUETTE} />
      <Rect x={41} y={130} width={18} height={62} rx={9} fill={SILHOUETTE} />
      <Rect x={43} y={190} width={14} height={44} rx={7} fill={SILHOUETTE} />
      <Ellipse cx={50} cy={240} rx={8} ry={5} fill={SILHOUETTE} />
    </>
  );
  return (
    <>
      <Ellipse cx={60} cy={20} rx={11} ry={13} fill={SILHOUETTE} />
      <Rect x={54} y={31} width={12} height={9} rx={3} fill={SILHOUETTE} />
      <Path d="M42 40 Q60 36 78 40 L82 58 L78 116 Q60 122 42 116 L38 58 Z" fill={SILHOUETTE} />
      <Path d="M42 112 Q60 118 78 112 L80 134 Q60 140 40 134 Z" fill={SILHOUETTE} />
      {half}
      <G transform={`translate(${VIEW_W}, 0) scale(-1, 1)`}>{half}</G>
    </>
  );
}

type Props = {
  /** Average weekly sets per muscle. */
  weeklySets: Record<MuscleGroup, number>;
  selected: MuscleGroup | null;
  onSelect: (muscle: MuscleGroup) => void;
};

function Figure({ view, label, ...props }: Props & { view: typeof FRONT; label: string }) {
  const draw = (shape: Shape, key: string) => {
    const on = props.selected === shape.muscle;
    return (
      <Fragment key={key}>
        {shape.node({
          fill: BAND_COLORS[muscleBand(props.weeklySets[shape.muscle])],
          // A surface-coloured outline keeps neighbouring muscles distinct.
          stroke: on ? theme.colors.text : theme.colors.surface,
          strokeWidth: on ? 1.6 : 1.2,
          onPress: () => props.onSelect(shape.muscle),
        })}
      </Fragment>
    );
  };
  return (
    <View style={styles.figure}>
      <View style={styles.svgBox}>
      <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%">
        <Silhouette />
        {view.paired.map((s, i) => draw(s, `l${i}`))}
        <G transform={`translate(${VIEW_W}, 0) scale(-1, 1)`}>
          {view.paired.map((s, i) => draw(s, `r${i}`))}
        </G>
        {view.center.map((s, i) => draw(s, `c${i}`))}
      </Svg>
      </View>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

/** Front and back figures shaded by weekly sets. Tap a muscle to select it. */
export function MuscleMap(props: Props) {
  return (
    <View
      style={styles.row}
      accessibilityLabel="Body map of muscles trained. The list below gives the same values."
    >
      <Figure {...props} view={FRONT} label="Front" />
      <Figure {...props} view={BACK} label="Back" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  figure: { flex: 1, maxWidth: 170, alignItems: 'center' },
  svgBox: { width: '100%', aspectRatio: VIEW_W / VIEW_H },
  figureLabel: { ...theme.font.kicker, color: theme.colors.textFaint, marginTop: 6 },
});
