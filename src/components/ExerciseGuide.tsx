import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import guides from '@/data/exercise-guides.json';
import { getExerciseById } from '@/src/domain/catalog';
import { getExerciseDemonstration } from '@/src/domain/exerciseDemonstration';
import { cleanGuideText, conciseGuideSteps } from '@/src/domain/guideText';
import { ExerciseDemonstration } from './ExerciseDemonstration';
import { MuscleFocus } from './MuscleFocus';
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
  const hasDemo = getExerciseDemonstration(props.exerciseId).kind !== 'unavailable';
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
  const exercise = getExerciseById(exerciseId);
  const [fullInstructions, setFullInstructions] = useState(false);

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
        {exercise ? (
          <>
            <View style={styles.stage}>
              <ExerciseDemonstration key={exerciseId} exercise={exercise} style={styles.figure} />
            </View>
            <Text style={styles.stepsKicker}>Muscles worked</Text>
            <View style={styles.muscles}>
              <MuscleFocus primary={exercise.primary_muscles} secondary={exercise.secondary_muscles} />
            </View>
          </>
        ) : null}
        <Text style={styles.stepsKicker}>How to perform</Text>
        {steps.map((step, index) => (
          <View key={index} style={styles.step}>
            <Text style={styles.number}>{index + 1}</Text>
            <Text style={styles.instruction}>{step}</Text>
          </View>
        ))}
        {!steps.length ? <Text style={styles.instruction}>Guidance is not available for this exercise yet.</Text> : null}
        {steps.length ? <PrimaryButton title={fullInstructions ? 'Show short steps' : 'Read full instructions'} variant="ghost" onPress={() => setFullInstructions(value => !value)} /> : null}
        <Text style={styles.attribution}>Instructions and muscle data: free-exercise-db · Public domain. Demonstration figure: original artwork.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cue: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  stage: { ...theme.card, aspectRatio: 200 / 190, padding: 10, marginBottom: 22 },
  figure: { flex: 1 },
  muscles: { ...theme.card, padding: 18, marginBottom: 22 },
  stepsKicker: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 14, marginTop: 8 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  number: { ...theme.font.mono, color: theme.colors.accentDeep, width: 20, paddingTop: 2 },
  instruction: { ...theme.font.body, color: theme.colors.textSecondary, flex: 1 },
  attribution: { ...theme.font.small, color: theme.colors.textFaint, marginTop: 18 },
});
