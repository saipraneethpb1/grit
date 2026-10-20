import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { loadKindFor, repProgress, REP_MS, sampleMotion, solve, type MotionTemplate } from '@/src/domain/motion';
import { useMotionAllowed } from '@/src/hooks/useMotionAllowed';
import { figureShapes, motionViewBox, type Role, type Shape } from '@/src/domain/motionShapes';
import type { Exercise } from '@/src/domain/types';
import { BAND_COLORS } from './AnatomicalBodyMap';
import { themed } from '@/constants/themed';

/** Same violet ramp as the Progress muscle map, so "worked" reads the same everywhere. */
const FILL = themed((): Record<Role, string> => ({
  primary: BAND_COLORS.target,
  secondary: BAND_COLORS.building,
  body: theme.colors.rigBody,
  bodyFar: theme.colors.rigBodyFar,
  joint: theme.colors.surface,
  scenery: theme.colors.rigScenery,
  load: theme.colors.rigLoad,
  cable: theme.colors.textFaint,
  ground: theme.colors.border,
}));
/** Roles drawn with a surface-coloured outline so neighbouring muscles separate. */
const OUTLINED = new Set<Role>(['primary', 'secondary', 'body', 'bodyFar', 'scenery', 'load']);
const OUTLINE = 1.2;
const FRAME_MS = 33;

function draw(shape: Shape, key: string, fill: string, grow: number) {
  if (shape.kind === 'line') {
    return (
      <Line key={key} x1={shape.a.x} y1={shape.a.y} x2={shape.b.x} y2={shape.b.y}
        stroke={fill} strokeWidth={shape.width + grow * 2} strokeLinecap="round" />
    );
  }
  if (shape.kind === 'circle') {
    return <Circle key={key} cx={shape.c.x} cy={shape.c.y} r={shape.r + grow} fill={fill} />;
  }
  return (
    <Polygon key={key} points={shape.points.map((p) => `${p.x},${p.y}`).join(' ')}
      fill={fill} stroke={fill} strokeWidth={1 + grow * 2} strokeLinejoin="round" />
  );
}

type Props = {
  exercise: Pick<Exercise, 'name' | 'primary_muscles' | 'secondary_muscles' | 'equipment'>;
  /** Supplied only after the exercise-ID fidelity check. No inferred fallback. */
  motion: MotionTemplate;
  position?: number;
  /** Loop the repetition. Off for list thumbnails, which hold one pose. */
  animate?: boolean;
  /** Paused by the viewer; the figure holds where it is. */
  paused?: boolean;
  /** Pose shown when not animating, 0 = start, 1 = end of the lift. */
  still?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Original, stylised demonstration of an exercise: an articulated figure moving
 * through one repetition, with the muscles it works shaded in the violet ramp.
 */
export function ExerciseAnimation({ exercise, motion: template, animate = true, paused = false, position, still = 0.6, style }: Props) {
  const emphasis = useMemo(
    () => ({ primary: exercise.primary_muscles, secondary: exercise.secondary_muscles }),
    [exercise.primary_muscles, exercise.secondary_muscles]
  );
  const load = useMemo(() => loadKindFor(exercise.equipment), [exercise.equipment]);
  const viewBox = useMemo(() => motionViewBox(template, load), [template, load]);
  const allowed = useMotionAllowed();
  const running = animate && allowed && !paused;

  const [progress, setProgress] = useState(animate ? 0 : still);
  const [alternate, setAlternate] = useState(false);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = 0;
    let lastPaint = 0;
    const tick = (now: number) => {
      if (last) elapsed.current += now - last;
      last = now;
      if (now - lastPaint >= FRAME_MS) {
        lastPaint = now;
        setProgress(template.loop ? (elapsed.current % REP_MS) / REP_MS : repProgress(elapsed.current));
        setAlternate(Math.floor(elapsed.current / REP_MS) % 2 === 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, template.loop]);

  // Reduce Motion: hold the working position rather than an arbitrary frame.
  const shown = position ?? (animate && !allowed ? still : progress);
  const shapes = useMemo(
    () => figureShapes(template, solve(sampleMotion(template, shown, alternate)), emphasis, load),
    [template, emphasis, load, shown, alternate]
  );

  return (
    <View style={style} accessible accessibilityRole="image" accessibilityLabel={`Animated demonstration of ${exercise.name}`}>
      <Svg viewBox={viewBox} width="100%" height="100%">
        {shapes.map((s, i) => [
          OUTLINED.has(s.role) ? draw(s, `o${i}`, s.role === 'scenery' ? theme.colors.borderStrong : theme.colors.surface, OUTLINE) : null,
          draw(s, `f${i}`, FILL[s.role], 0),
        ])}
      </Svg>
    </View>
  );
}
