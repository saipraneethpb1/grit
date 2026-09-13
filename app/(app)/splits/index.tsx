import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { LevelBadge } from '@/src/components/LevelBadge';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SplitCard } from '@/src/components/SplitCard';
import { getSplitTemplate, SPLIT_TEMPLATES } from '@/src/domain/catalog';
import {
  EXPERIENCE_LEVEL_BLURBS,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  getMethodologiesByLevel,
  getMethodology,
  QUICK_START_METHODOLOGY_ID,
  type Methodology,
  type MethodologyId,
} from '@/src/domain/methodologies';

function previewHref(templateId: string, methodologyId: string) {
  return `/(app)/splits/preview?templateId=${templateId}&methodologyId=${methodologyId}`;
}

/** "3 days / week · up to 6 exercises" — the real commitment, before you commit. */
function methodologyCommitment(m: Methodology): string {
  const split = getSplitTemplate(m.defaultSplitId);
  const days = split ? `${split.days_per_week} days / week` : 'Flexible schedule';
  return `${days} · up to ${m.maxExercisesPerDay} exercises a session`;
}

/** Thin step bars, the onboarding progress mark. */
function StepBars({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepBars} accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.stepBar, i < step && styles.stepBarOn]} />
      ))}
    </View>
  );
}

export default function SplitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'method' | 'split'>('method');
  const [methodId, setMethodId] = useState<MethodologyId | null>(null);

  const method = methodId ? getMethodology(methodId) : undefined;
  const quickStart = getMethodology(QUICK_START_METHODOLOGY_ID);

  // This screen is a two-step wizard on one route, so system back has to walk
  // back through the steps before it leaves.
  useEffect(() => {
    if (Platform.OS !== 'android' || step !== 'split') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep('method');
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const preferred = method
    ? SPLIT_TEMPLATES.filter(
        (s) => s.is_active && method.preferredSplits.includes(s.id)
      )
    : [];
  const splitList = preferred.length
    ? preferred
    : SPLIT_TEMPLATES.filter((s) => s.is_active);

  if (step === 'split') {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <StepBars step={2} total={2} />
        <Text style={styles.kicker}>Step 2 of 2</Text>
        <Text style={styles.title}>How many days</Text>
        <Text style={styles.lead}>
          Fewer days means more muscles per session, never fewer sets per muscle across the week. The recommended split fits {method?.name}.
        </Text>

        {splitList.map((split) => (
          <SplitCard
            key={split.id}
            split={split}
            selected={split.id === method?.defaultSplitId}
            badge={split.id === method?.defaultSplitId ? 'Recommended' : undefined}
            onPress={() =>
              router.push(previewHref(split.id, methodId ?? '') as never)
            }
          />
        ))}

        <PrimaryButton
          title="Back to training styles"
          variant="link"
          onPress={() => setStep('method')}
          style={styles.backLink}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <StepBars step={1} total={2} />
        <Text style={styles.kicker}>Step 1 of 2</Text>
        <Text style={styles.title}>Choose a training style</Text>
        <Text style={styles.lead}>
          Every style biases the sets, rep ranges and movement choices the generator makes. Pick what you are chasing, or bring your own routine.
        </Text>

        <View style={styles.shortcuts}>
          <Pressable
            onPress={() => router.push('/(app)/splits/custom')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.shortcut, pressed && styles.optionPressed]}
          >
            <Text style={styles.shortcutTitle}>Already have a routine?</Text>
            <Text style={styles.shortcutBody}>Build a custom program from your own days, exercises, sets and reps.</Text>
          </Pressable>
          {quickStart ? (
            <Pressable
              onPress={() => router.push(previewHref(quickStart.defaultSplitId, quickStart.id) as never)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.shortcut, styles.shortcutTint, pressed && styles.optionPressed]}
            >
              <Text style={styles.shortcutKicker}>New to lifting?</Text>
              <Text style={styles.shortcutTitle}>Skip the setup</Text>
              <Text style={styles.shortcutBody}>
                {quickStart.tagline} The whole week is built for you and can change any time.
              </Text>
            </Pressable>
          ) : null}
        </View>

        {EXPERIENCE_LEVELS.map((level) => {
          const group = getMethodologiesByLevel(level);
          if (group.length === 0) return null;

          return (
            <View key={level} style={styles.levelGroup}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>{EXPERIENCE_LEVEL_LABELS[level]}</Text>
                <LevelBadge level={level} />
              </View>
              <Text style={styles.levelBlurb}>{EXPERIENCE_LEVEL_BLURBS[level]}</Text>

              <View style={styles.options}>
                {group.map((m) => {
                  const selected = methodId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMethodId(m.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.optionSelected,
                        pressed && !selected && styles.optionPressed,
                      ]}
                    >
                      <View style={styles.radio}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={styles.optionBody}>
                        <Text style={styles.optionLabel}>{m.name}</Text>
                        <Text style={styles.optionNote}>{m.tagline}</Text>
                        <Text style={styles.optionMeta}>{methodologyCommitment(m)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.space.md) }]}>
        <PrimaryButton
          title={method ? `Continue with ${method.name}` : 'Choose a training style'}
          disabled={!methodId}
          onPress={() => setStep('split')}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: theme.space.xl },
  stepBars: { flexDirection: 'row', gap: 5, marginBottom: 30 },
  stepBar: { flex: 1, height: 2, borderRadius: 1, backgroundColor: theme.colors.border },
  stepBarOn: { backgroundColor: theme.colors.accent },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 12 },
  title: { ...theme.font.hero, color: theme.colors.text, marginBottom: 10 },
  lead: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: 26 },

  shortcuts: { gap: 9, marginBottom: 26 },
  shortcut: { ...theme.card, paddingHorizontal: 15, paddingVertical: 14, gap: 3 },
  shortcutTint: { backgroundColor: theme.colors.surfaceTint, borderColor: theme.colors.borderTint },
  shortcutKicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 3 },
  shortcutTitle: { ...theme.font.bodyMedium, color: theme.colors.text },
  shortcutBody: { ...theme.font.small, color: theme.colors.textDim },

  levelGroup: { marginBottom: 24 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginBottom: 4 },
  levelTitle: { ...theme.font.bodyMedium, color: theme.colors.text },
  levelBlurb: { ...theme.font.small, color: theme.colors.textDim, marginBottom: 10 },
  options: { gap: 9 },
  option: {
    ...theme.card,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  optionSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  optionPressed: { borderColor: theme.colors.accentDim },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },
  optionBody: { flex: 1, minWidth: 0 },
  optionLabel: { ...theme.font.bodyMedium, color: theme.colors.text },
  optionNote: { ...theme.font.small, color: theme.colors.textDim, marginTop: 2 },
  optionMeta: { ...theme.font.monoSmall, fontSize: 10.5, color: theme.colors.textFaint, marginTop: 5 },

  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
  cta: { minHeight: 50 },
  backLink: { marginTop: 8 },
});
