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
import { theme } from '@/constants/theme';
import { LevelBadge } from '@/src/components/LevelBadge';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SectionLabel } from '@/src/components/SectionLabel';
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

export default function SplitsScreen() {
  const router = useRouter();
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
        <SectionLabel>Step 2 of 2</SectionLabel>
        <Text style={styles.title}>Weekly split</Text>
        <Text style={styles.lead}>
          How {method?.name} spreads across your week. The recommended one is set up
          for this system — the others still work.
        </Text>

        <PrimaryButton
          title="← Back to systems"
          variant="ghost"
          onPress={() => setStep('method')}
          style={{ marginBottom: theme.space.md }}
        />

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
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionLabel>Step 1 of 2</SectionLabel>
      <Text style={styles.title}>Training system</Text>
      <Text style={styles.lead}>
        Public training principles. Not affiliated with any coach or brand.
      </Text>

      {quickStart ? (
        <View style={styles.quickStart}>
          <Text style={styles.quickStartKicker}>New to lifting?</Text>
          <Text style={styles.quickStartTitle}>Skip the setup</Text>
          <Text style={styles.quickStartBody}>
            {quickStart.tagline} We will build the whole week for you — you can change
            it any time.
          </Text>
          <PrimaryButton
            title="Start a beginner program"
            onPress={() =>
              router.push(
                previewHref(quickStart.defaultSplitId, quickStart.id) as never
              )
            }
            style={{ marginTop: theme.space.md }}
          />
        </View>
      ) : null}

      <Text style={styles.orLabel}>or pick a system</Text>

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

            {group.map((m) => {
              const selected = methodId === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMethodId(m.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.methodCard,
                    selected && styles.methodCardSelected,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.methodName, selected && styles.methodNameSelected]}>
                    {m.name}
                  </Text>
                  <Text style={[styles.methodTag, selected && styles.methodTagSelected]}>
                    {m.tagline}
                  </Text>
                  <Text style={[styles.methodMeta, selected && styles.methodMetaSelected]}>
                    {methodologyCommitment(m)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <View style={styles.footerSpacer} />

      <PrimaryButton
        title={method ? `Continue with ${method.name}` : 'Choose a system to continue'}
        disabled={!methodId}
        onPress={() => setStep('split')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: theme.space.sm },
  lead: {
    ...theme.font.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.lg,
  },

  quickStart: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.successBorder,
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
  },
  quickStartKicker: {
    ...theme.font.label,
    color: theme.colors.success,
    marginBottom: 4,
  },
  quickStartTitle: {
    ...theme.font.title,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  quickStartBody: {
    ...theme.font.caption,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },

  orLabel: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginVertical: theme.space.lg,
  },

  levelGroup: { marginBottom: theme.space.lg },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginBottom: 4,
  },
  levelTitle: { ...theme.font.bodyMedium, color: theme.colors.text },
  levelBlurb: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.space.sm,
  },

  methodCard: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    backgroundColor: theme.colors.card,
  },
  methodCardSelected: {
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.white,
  },
  methodName: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 4 },
  methodNameSelected: { color: theme.colors.black },
  methodTag: { ...theme.font.caption, color: theme.colors.textSecondary, lineHeight: 18 },
  methodTagSelected: { color: theme.colors.black },
  methodMeta: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: 6 },
  methodMetaSelected: { color: theme.colors.black, opacity: 0.7 },

  footerSpacer: { height: theme.space.sm },
});
