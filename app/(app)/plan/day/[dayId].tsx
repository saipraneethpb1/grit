import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { DayWorkoutList } from '@/src/components/DayWorkoutList';
import { FadeRule } from '@/src/components/FadeRule';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { getSplitTemplate } from '@/src/domain/catalog';
import { formatMuscles } from '@/src/domain/muscles';
import { analyzeTrainingDay } from '@/src/domain/trainingAnalysis';
import { usePlan } from '@/src/hooks/usePlans';
import { usePreviousBests } from '@/src/hooks/useSessions';

export default function PlanDayScreen() {
  const { dayId, planId } = useLocalSearchParams<{ dayId: string; planId: string }>();
  const { data: plan, isLoading, error } = usePlan(planId);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const day = useMemo(
    () => plan?.plan_days.find((d) => d.id === dayId),
    [plan, dayId]
  );
  const exerciseIds = useMemo(
    () => day?.plan_exercises.map((pe) => pe.exercise_id) ?? [],
    [day]
  );
  const { data: lastByExercise } = usePreviousBests(exerciseIds);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error || !day || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Day not found'}
        </Text>
        <PrimaryButton title="Go back" variant="ghost" onPress={() => router.back()} style={styles.errorBtn} />
      </View>
    );
  }

  const template = getSplitTemplate(plan.template_id);
  const programName = plan.template_id === 'custom' ? plan.name : template?.name ?? 'Program';
  const audit = analyzeTrainingDay(day);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, theme.space.lg) + theme.space.md },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={10}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="arrow-back" size={14} color={theme.colors.textMuted} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.kicker}>Day {day.day_index + 1} · {programName}</Text>
      <Text style={styles.title}>{day.name}</Text>
      <Text style={styles.meta}>
        {formatMuscles(day.focus_muscles)}. {day.plan_exercises.length} exercises, {audit.totalSets} sets, about {audit.estimatedMinutes} minutes.
      </Text>

      <FadeRule style={styles.rule} />

      <DayWorkoutList day={day} showHeader={false} lastByExercise={lastByExercise} />

      <PrimaryButton
        title="Start workout"
        icon={<Ionicons name="play" size={14} color={theme.colors.accentText} />}
        onPress={() => router.push(`/(app)/workout/${day.id}?planId=${plan.id}` as never)}
        style={styles.start}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: theme.space.lg },
  errorText: { ...theme.font.body, color: theme.colors.text },
  errorBtn: { marginTop: theme.space.md, minWidth: 160 },
  content: { paddingHorizontal: theme.space.lg },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginBottom: 18, minHeight: 30 },
  backText: { ...theme.font.body, fontSize: 13, color: theme.colors.textMuted },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep },
  title: { ...theme.font.display, color: theme.colors.text, marginTop: 7, marginBottom: 5 },
  meta: { ...theme.font.caption, color: theme.colors.textDim },
  rule: { marginVertical: 18 },
  start: { marginTop: 18, minHeight: 50 },
});
