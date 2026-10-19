import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';
import { anatomicalCell, anatomicalSequence, ANATOMICAL_PHASES, type AnatomicalDemonstration } from '@/src/domain/exerciseAnatomy';
import { exerciseAnatomyAssets, exerciseAnatomyThumbnails } from '@/src/domain/exerciseAnatomyAssets';
import { useMotionAllowed } from '@/src/hooks/useMotionAllowed';

type Props = {
  exerciseId: string;
  demonstration: AnatomicalDemonstration;
  animate: boolean;
  style?: StyleProp<ViewStyle>;
  onError?: () => void;
};

const HOLD_MS = 1250;
/** A start/end pair holds each position longer so it reads as a slow, deliberate rep. */
const PAIR_HOLD_MS = 1800;
/** Long enough to read as one movement, short enough that each pose still holds. */
const FADE_MS = 280;

/** One cell of the sheet, cropped by offsetting the whole image inside a clipped square. */
function Pose({ source, frame, columns, rows, size, label, onError }: {
  source: ImageSourcePropType; frame: number; columns: number; rows: number; size: number; label: string; onError: () => void;
}) {
  const { column, row } = anatomicalCell(frame, columns);
  return (
    <Image source={source} resizeMode="stretch" accessible={!!label} accessibilityLabel={label} onError={onError}
      style={{ position: 'absolute', width: size * columns, height: size * rows, left: -column * size, top: -row * size }} />
  );
}

/**
 * Authored anatomical positions; switching positions never stretches or morphs anatomy.
 * The next pose fades in over the current one, so the cut between drawings reads as
 * motion instead of a jump.
 */
export function AnatomicalExerciseDemonstration({ exerciseId, demonstration: demo, animate, style, onError }: Props) {
  const allowed = useMotionAllowed();
  const [paused, setPaused] = useState(false);
  const [{ step, previous }, setPosition] = useState<{ step: number; previous: number | null }>({ step: 0, previous: null });
  const fade = useRef(new Animated.Value(1)).current;
  const sequence = useMemo(() => anatomicalSequence(demo), [demo]);
  const frame = sequence[step % sequence.length];
  const phase = demo.phaseLabels?.[step % sequence.length] ?? ANATOMICAL_PHASES[frame];
  const [size, setSize] = useState(0);
  const [failed, setFailed] = useState(false);
  const running = animate && allowed && !paused && !failed;
  const source = (animate ? exerciseAnatomyAssets : exerciseAnatomyThumbnails)[exerciseId];

  const advance = useCallback(() => setPosition(value => ({
    previous: sequence[value.step % sequence.length],
    step: (value.step + 1) % sequence.length,
  })), [sequence]);
  const transitioning = animate && allowed && previous !== null && previous !== frame;
  const artworkFailed = () => { setFailed(true); onError?.(); };

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(advance, sequence.length === 2 ? PAIR_HOLD_MS : HOLD_MS);
    return () => clearInterval(timer);
  }, [running, advance, sequence.length]);

  useEffect(() => {
    if (!transitioning) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    const animation = Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: Platform.OS !== 'web' });
    animation.start(({ finished }) => {
      if (finished) setPosition(value => value.step === step ? { ...value, previous: null } : value);
    });
    return () => animation.stop();
  }, [step, transitioning, fade]);

  const label = `${demo.name}: ${phase}. Anatomical illustration.`;
  return (
    <View style={style}>
      <View style={styles.stage} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setSize(Math.max(0, Math.min(width, height)));
      }}>
        {failed || !source ? <Text style={styles.error}>Demonstration could not load.</Text> : (
          <View style={{ width: size, height: size, overflow: 'hidden' }}>
            {transitioning ? (
              <Pose source={source} frame={previous} columns={demo.columns} rows={demo.rows} size={size} label="" onError={artworkFailed} />
            ) : null}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: transitioning ? fade : 1 }]}>
              <Pose source={source} frame={frame} columns={demo.columns} rows={demo.rows} size={size} label={label} onError={artworkFailed} />
            </Animated.View>
          </View>
        )}
      </View>
      {animate ? (
        <View style={styles.controls}>
          <Text style={styles.caption} accessibilityLiveRegion={paused ? 'polite' : 'none'}>{phase} · {step + 1}/{sequence.length}</Text>
          {allowed ? <Pressable style={styles.button} accessibilityRole="button"
            accessibilityLabel={paused ? 'Play demonstration' : 'Pause demonstration'} onPress={() => setPaused(value => !value)}>
            <Ionicons name={paused ? 'play' : 'pause'} size={16} color={theme.colors.textSecondary} />
          </Pressable> : null}
          <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel="Next demonstration position"
            onPress={() => { setPaused(true); advance(); }}>
            <Ionicons name="play-skip-forward" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf9f4', borderRadius: theme.radius.md, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  caption: { ...theme.font.small, color: theme.colors.textMuted, flex: 1 },
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceRaised },
  error: { ...theme.font.small, color: '#514740', padding: 12 },
});
