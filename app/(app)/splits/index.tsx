import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SectionLabel } from '@/src/components/SectionLabel';
import { SplitCard } from '@/src/components/SplitCard';
import { SPLIT_TEMPLATES } from '@/src/domain/catalog';
import { METHODOLOGIES, type MethodologyId } from '@/src/domain/methodologies';

export default function SplitsScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'method' | 'split'>('method');
  const [methodId, setMethodId] = useState<MethodologyId | null>(null);

  const method = METHODOLOGIES.find((m) => m.id === methodId);

  const splits = method
    ? SPLIT_TEMPLATES.filter((s) => s.is_active && method.preferredSplits.includes(s.id))
    : SPLIT_TEMPLATES.filter((s) => s.is_active);

  const splitList = splits.length > 0 ? splits : SPLIT_TEMPLATES.filter((s) => s.is_active);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {step === 'method' ? (
        <>
          <SectionLabel>Step 1</SectionLabel>
          <Text style={styles.title}>Training system</Text>
          <Text style={styles.lead}>
            Public training principles. Not affiliated with any coach or brand.
          </Text>

          {METHODOLOGIES.map((m) => {
            const selected = methodId === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMethodId(m.id)}
                style={[styles.methodCard, { borderColor: selected ? theme.colors.white : theme.colors.border }]}
              >
                <Text style={styles.methodName}>{m.name}</Text>
                <Text style={styles.methodTag}>{m.tagline}</Text>
              </Pressable>
            );
          })}

          <PrimaryButton
            title="Choose split"
            disabled={!methodId}
            onPress={() => setStep('split')}
            style={{ marginTop: theme.space.md }}
          />
        </>
      ) : (
        <>
          <SectionLabel>Step 2</SectionLabel>
          <Text style={styles.title}>Weekly split</Text>
          <Text style={styles.lead}>{method?.name}</Text>

          <PrimaryButton
            title="Back"
            variant="ghost"
            onPress={() => setStep('method')}
            style={{ marginBottom: theme.space.md }}
          />

          {splitList.map((split) => (
            <SplitCard
              key={split.id}
              split={split}
              selected={split.id === method?.defaultSplitId}
              onPress={() =>
                router.push(
                  `/(app)/splits/preview?templateId=${split.id}&methodologyId=${methodId}` as never
                )
              }
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: theme.space.sm },
  lead: { ...theme.font.body, color: theme.colors.textSecondary, marginBottom: theme.space.lg },
  methodCard: {
    borderWidth: theme.hairline,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    backgroundColor: theme.colors.card,
  },
  methodName: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 4 },
  methodTag: { ...theme.font.caption, color: theme.colors.textMuted },
});
