import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import guides from '@/data/exercise-guides.json';
import { exerciseGuideImages } from '@/src/domain/exerciseGuideImages';
import { cleanGuideText, conciseGuideSteps } from '@/src/domain/guideText';
import { PrimaryButton } from './PrimaryButton';

type Props = { exerciseId: string; name: string; notes?: string | null };
type Guide = { sourceId: string; instructions: string[] };

/**
 * Cue card for the current movement: the short steps inline, the full
 * demonstration in a local modal so the active workout (and every unsaved
 * set) stays mounted underneath it.
 */
export function ExerciseGuide(props: Props) {
  const [open, setOpen] = useState(false);
  const guide = (guides as Record<string, Guide>)[props.exerciseId];
  const quickSteps = conciseGuideSteps(guide?.instructions ?? (props.notes ? [props.notes] : []), guide?.sourceId).slice(0, 3);
  const hasDemo = Boolean(exerciseGuideImages[props.exerciseId]);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How to perform ${props.name}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.cue, pressed && styles.cuePressed]}
      >
        <Ionicons name="body-outline" size={15} color={theme.colors.accent} style={styles.cueIcon} />
        <View style={styles.cueBody}>
          <Text style={styles.cueKicker}>How to perform</Text>
          {quickSteps.length ? (
            quickSteps.map((text, index) => (
              <Text key={index} style={styles.cueStep}>
                <Text style={styles.cueNumber}>{index + 1}  </Text>
                {text}
              </Text>
            ))
          ) : (
            <Text style={styles.cueStep}>Guidance is not available for this exercise yet.</Text>
          )}
          <Text style={styles.cueLink}>{hasDemo ? 'Watch demo' : 'Read more'} ›</Text>
        </View>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        {open ? <GuideContent key={props.exerciseId} {...props} onClose={() => setOpen(false)} /> : null}
      </Modal>
    </>
  );
}

function GuideContent({ exerciseId, name, notes, onClose }: Props & { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const guide = (guides as Record<string, Guide>)[exerciseId];
  const images = exerciseGuideImages[exerciseId];
  const [fullInstructions, setFullInstructions] = useState(false);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (mounted && !changed) setPlaying(!reduce);
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', reduce => {
      changed = true;
      if (reduce) setPlaying(false);
    });
    const state = AppState.addEventListener('change', value => setForeground(value === 'active'));
    return () => { mounted = false; motion.remove(); state.remove(); };
  }, []);

  useEffect(() => {
    if (!playing || !foreground || !images || imageFailed) return;
    const timer = setInterval(() => setFrame(value => 1 - value), 1400);
    return () => clearInterval(timer);
  }, [playing, foreground, images, imageFailed]);

  const originalSteps = guide?.instructions ?? (notes ? [notes] : []);
  const steps = fullInstructions ? originalSteps.map(cleanGuideText) : conciseGuideSteps(originalSteps, guide?.sourceId);
  return (
    <View style={[styles.root, { paddingTop: insets.top }]} accessibilityViewIsModal>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>{name}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {images && !imageFailed ? (
          <>
            <View style={styles.imageWrap}>
              {images.map((source, index) => (
                <Image
                  key={index}
                  source={source}
                  resizeMode="contain"
                  accessible={index === frame}
                  accessibilityLabel={`${name}, demonstration position ${index + 1} of 2`}
                  style={[styles.image, { opacity: index === frame ? 1 : 0 }]}
                  onError={() => { setImageFailed(true); setPlaying(false); }}
                />
              ))}
            </View>
            <Text style={styles.caption}>Position {frame + 1} of 2</Text>
            <View style={styles.controls}>
              <PrimaryButton title={playing ? 'Pause' : 'Play demo'} variant="ghost" onPress={() => setPlaying(value => !value)} style={styles.control} />
              <PrimaryButton title="Next position" variant="ghost" onPress={() => { setPlaying(false); setFrame(value => 1 - value); }} style={styles.control} />
            </View>
          </>
        ) : <Text style={styles.caption}>Demonstration unavailable. Follow the instructions below.</Text>}
        <Text style={styles.stepsKicker}>How to perform</Text>
        {steps.map((step, index) => (
          <View key={index} style={styles.step}>
            <Text style={styles.number}>{index + 1}</Text>
            <Text style={styles.instruction}>{step}</Text>
          </View>
        ))}
        {!steps.length ? <Text style={styles.instruction}>Guidance is not available for this exercise yet.</Text> : null}
        {steps.length ? <PrimaryButton title={fullInstructions ? 'Show short steps' : 'Read full instructions'} variant="ghost" onPress={() => setFullInstructions(value => !value)} /> : null}
        <Text style={styles.attribution}>Demonstration & instructions: free-exercise-db · Public domain</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cue: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderTint,
  },
  cuePressed: { borderColor: theme.colors.accentDim },
  cueIcon: { marginTop: 1 },
  cueBody: { flex: 1, gap: 5 },
  cueKicker: { ...theme.font.kicker, color: theme.colors.accentDeep },
  cueStep: { ...theme.font.caption, lineHeight: 19, color: theme.colors.textSecondary },
  cueNumber: { ...theme.font.monoSmall, color: theme.colors.accentDeep },
  cueLink: { ...theme.font.small, color: theme.colors.accentBright, marginTop: 3 },

  root: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.divider,
  },
  title: { ...theme.font.heading, color: theme.colors.text, flex: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: theme.space.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  imageWrap: { aspectRatio: 1.35, backgroundColor: '#fff', borderRadius: theme.radius.md, overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  caption: { ...theme.font.small, color: theme.colors.textDim, marginTop: 6 },
  controls: { flexDirection: 'row', gap: 9, marginTop: 14, marginBottom: 22 },
  control: { flex: 1 },
  stepsKicker: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 14, marginTop: 8 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  number: { ...theme.font.mono, color: theme.colors.accentDeep, width: 20, paddingTop: 2 },
  instruction: { ...theme.font.body, color: theme.colors.textSecondary, flex: 1 },
  attribution: { ...theme.font.small, color: theme.colors.textFaint, marginTop: 18 },
});
