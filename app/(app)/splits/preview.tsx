import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { DayWorkoutList } from '@/src/components/DayWorkoutList';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { TrainingAudit } from '@/src/components/TrainingAudit';
import { EXERCISES, getSplitTemplate } from '@/src/domain/catalog';
import { getMethodology } from '@/src/domain/methodologies';
import { generatePlan } from '@/src/domain/planGenerator';
import { useSavePlan } from '@/src/hooks/usePlans';

export default function PreviewPlanScreen() {
  const { templateId, methodologyId } = useLocalSearchParams<{
    templateId: string;
    methodologyId?: string;
  }>();
  const router = useRouter();
  const savePlan = useSavePlan();
  const [saving, setSaving] = useState(false);

  const template = templateId ? getSplitTemplate(templateId) : undefined;
  const methodology = methodologyId ? getMethodology(methodologyId) : undefined;

  const plan = useMemo(() => {
    if (!templateId) return null;
    try {
      return generatePlan({
        templateId,
        exercises: EXERCISES,
        methodologyId: methodologyId || undefined,
      });
    } catch {
      return null;
    }
  }, [templateId, methodologyId]);

  async function onSave() {
    if (!plan) return;
    setSaving(true);
    try {
      const id = await savePlan.mutateAsync(plan);
      router.replace(`/(app)/plan/${id}` as never);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save plan';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }

  if (!template || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unknown split template.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {methodology ? <Text style={styles.method}>{methodology.name}</Text> : null}
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.desc}>{methodology?.description ?? template.description}</Text>

        <TrainingAudit plan={plan} />

        {plan.days.map((day) => (
          <View key={day.day_index} style={styles.dayBlock}>
            <DayWorkoutList day={day} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Save program"
          onPress={onSave}
          loading={saving || savePlan.isPending}
          disabled={saving || savePlan.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg, paddingBottom: 100 },
  method: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.xs },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: theme.space.sm },
  desc: { ...theme.font.body, color: theme.colors.textSecondary, marginBottom: theme.space.md },
  dayBlock: {
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    paddingTop: theme.space.md,
    marginBottom: theme.space.md,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.space.lg,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
});
