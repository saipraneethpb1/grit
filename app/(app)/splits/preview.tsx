import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { DayWorkoutList } from '@/src/components/DayWorkoutList';
import { FadeRule } from '@/src/components/FadeRule';
import { LevelBadge } from '@/src/components/LevelBadge';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { TrainingAudit } from '@/src/components/TrainingAudit';
import { EXERCISES, getSplitTemplate } from '@/src/domain/catalog';
import { getMethodology } from '@/src/domain/methodologies';
import { generatePlan } from '@/src/domain/planGenerator';
import { filterCatalogForEquipment, parseEquipmentParam } from '@/src/domain/planIntent';
import { useSavePlan } from '@/src/hooks/usePlans';

export default function PreviewPlanScreen() {
  const { templateId, methodologyId, equipment } = useLocalSearchParams<{
    templateId: string;
    methodologyId?: string;
    /** Comma list from "Describe your week"; absent means a full gym. */
    equipment?: string;
  }>();
  const router = useRouter();
  const savePlan = useSavePlan();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const footerPad = Math.max(insets.bottom, theme.space.lg);

  const template = templateId ? getSplitTemplate(templateId) : undefined;
  const methodology = methodologyId ? getMethodology(methodologyId) : undefined;

  const kit = useMemo(() => parseEquipmentParam(equipment), [equipment]);

  const plan = useMemo(() => {
    if (!templateId) return null;
    try {
      const exercises = kit ? filterCatalogForEquipment(EXERCISES, kit, templateId).exercises : EXERCISES;
      return generatePlan({
        templateId,
        exercises,
        methodologyId: methodologyId || undefined,
      });
    } catch {
      return null;
    }
  }, [templateId, methodologyId, kit]);

  async function onSave() {
    if (!plan || saving) return;
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
        <Text style={styles.errorText}>This program is unavailable. Go back and choose another.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 88 + footerPad }]}
        showsVerticalScrollIndicator={false}
      >
        {methodology ? (
          <View style={styles.methodRow}>
            <Text style={styles.kicker}>{methodology.name}</Text>
            <LevelBadge level={methodology.level} />
          </View>
        ) : null}
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.desc}>{methodology?.description ?? template.description}</Text>

        <TrainingAudit plan={plan} />

        {plan.days.map((day, i) => (
          <View key={day.day_index}>
            {i > 0 ? <FadeRule style={styles.rule} /> : null}
            <Text style={styles.dayKicker}>Day {day.day_index + 1}</Text>
            <DayWorkoutList day={day} />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <PrimaryButton
          title="Start this program"
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: theme.space.lg },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginBottom: 8 },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep },
  title: { ...theme.font.display, color: theme.colors.text, marginBottom: 6 },
  desc: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: theme.space.md },
  rule: { marginVertical: 18 },
  dayKicker: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 6 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.space.lg,
    paddingTop: 12,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
});
