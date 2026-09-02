import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { DayWorkoutList } from '@/src/components/DayWorkoutList';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { formatMuscles } from '@/src/domain/muscles';
import { usePlan } from '@/src/hooks/usePlans';

export default function PlanDayScreen() {
  const { dayId, planId } = useLocalSearchParams<{ dayId: string; planId: string }>();
  const { data: plan, isLoading, error } = usePlan(planId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const footerPad = Math.max(insets.bottom, theme.space.lg);

  const day = useMemo(
    () => plan?.plan_days.find((d) => d.id === dayId),
    [plan, dayId]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (error || !day || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Day not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 88 + footerPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Day {day.day_index + 1}</Text>
        <Text style={styles.title}>{day.name}</Text>
        <Text style={styles.meta}>{formatMuscles(day.focus_muscles)}</Text>
        <DayWorkoutList day={day} showHeader={false} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <PrimaryButton
          title="Start workout"
          onPress={() =>
            router.push(`/(app)/workout/${day.id}?planId=${plan.id}` as never)
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg },
  kicker: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: 4 },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: 4 },
  meta: { ...theme.font.caption, color: theme.colors.textSecondary, marginBottom: theme.space.lg },
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
