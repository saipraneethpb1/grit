import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';
import { getExerciseDemonstration } from '@/src/domain/exerciseDemonstration';
import type { Exercise } from '@/src/domain/types';
import { useMotionAllowed } from '@/src/hooks/useMotionAllowed';
import { ExerciseAnimation } from './ExerciseAnimation';

type Props = { exercise: Exercise; animate?: boolean; style?: StyleProp<ViewStyle> };

/** The library and workout guide use the same exercise-specific figure. */
export function ExerciseDemonstration({ exercise, animate = true, style }: Props) {
  const demo = getExerciseDemonstration(exercise.id);
  const allowed = useMotionAllowed();
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState<number>();
  if (demo.kind === 'unavailable') {
    return <View style={[styles.unavailable, style]}><Text style={styles.caption}>Demonstration unavailable.</Text></View>;
  }
  return (
    <View style={style}>
      <View style={styles.visual}>
        <ExerciseAnimation exercise={exercise} motion={demo.motion} animate={animate} paused={paused}
          position={position} style={styles.figure} />
      </View>
      {animate ? (
        <View style={styles.controls}>
          <Text style={styles.caption}>{demo.motion.isometric ? 'Hold against resistance' : demo.motion.camera === 'overhead' ? 'Overhead view' : demo.motion.cue ?? 'Illustrated movement'}</Text>
          {allowed ? <Pressable accessibilityRole="button" accessibilityLabel={paused ? 'Play demonstration' : 'Pause demonstration'}
            onPress={() => { setPosition(undefined); setPaused(value => !value); }} style={styles.control}>
            <Ionicons name={paused ? 'play' : 'pause'} size={16} color={theme.colors.textSecondary} />
          </Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Next demonstration position"
            onPress={() => { setPaused(true); setPosition(value => value === undefined || value >= 1 ? 0 : value + 0.25); }} style={styles.control}>
            <Ionicons name="play-skip-forward" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  visual: { flex: 1, overflow: 'hidden', borderRadius: theme.radius.md },
  figure: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  caption: { ...theme.font.small, color: theme.colors.textMuted, flex: 1 },
  control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceRaised },
  unavailable: { alignItems: 'center', justifyContent: 'center', padding: 12 },
});
