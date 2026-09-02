import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { RestTimer } from '@/src/components/RestTimer';
import { WorkoutCompleteSheet } from '@/src/components/WorkoutCompleteSheet';
import { sanitizeRepsInput, sanitizeWeightInput } from '@/src/domain/liveWorkout';
import type { WorkoutCompletionResult } from '@/src/domain/progression';
import { formatMuscles } from '@/src/domain/muscles';
import type { LiveExercise } from '@/src/domain/types';
import { useAuth } from '@/src/hooks/useAuth';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import { usePlan } from '@/src/hooks/usePlans';
import {
  abandonSession,
  buildLiveExercises,
  enrichWithHistory,
  startSession,
  useCompleteWorkout,
} from '@/src/hooks/useSessions';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutPlayerScreen() {
  const { dayId, planId } = useLocalSearchParams<{ dayId: string; planId: string }>();
  const { data: plan, isLoading } = usePlan(planId);
  const { user } = useAuth();
  const complete = useCompleteWorkout();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { padding: keyboardPadding, visible: keyboardVisible } = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);

  const day = useMemo(
    () => plan?.plan_days.find((d) => d.id === dayId),
    [plan, dayId]
  );

  const [exercises, setExercises] = useState<LiveExercise[]>([]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [booting, setBooting] = useState(true);
  const [restOpen, setRestOpen] = useState(false);
  const [restSec, setRestSec] = useState(90);
  const [finishing, setFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Held so the celebration sheet keeps the duration the workout actually took
  // rather than a timer that carries on ticking behind it.
  const [completion, setCompletion] = useState<WorkoutCompletionResult | null>(null);
  const [finishedElapsed, setFinishedElapsed] = useState('');
  const sessionStartedAt = useRef<number | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const pendingSession = useRef<Promise<string> | null>(null);
  const savedRef = useRef(false);
  const bootedForDay = useRef<string | null>(null);

  /**
   * The session row is created on the first completed set rather than on mount:
   * it keeps one round trip out of the screen's cold start, and stops a user who
   * only opens the day to look at it from leaving an `in_progress` row behind.
   */
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (!user || !plan || !day) throw new Error('Workout is still loading.');

    if (!pendingSession.current) {
      pendingSession.current = startSession({
        userId: user.id,
        planId: plan.id,
        planDayId: day.id,
        dayName: day.name,
      })
        .then((session) => {
          sessionIdRef.current = session.id;
          return session.id;
        })
        .catch((e) => {
          pendingSession.current = null;
          throw e;
        });
    }
    return pendingSession.current;
  }, [user?.id, plan?.id, day?.id, day?.name]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      // Wait for the plan query rather than reporting failure: `day` is only
      // resolvable once it lands.
      if (isLoading) return;
      if (!user || !plan || !day) {
        setBooting(false);
        return;
      }
      // Load the day exactly once. Re-running would replace `exercises` with a
      // blank slate and discard every set logged so far.
      if (bootedForDay.current === day.id) {
        setBooting(false);
        return;
      }
      bootedForDay.current = day.id;

      setBooting(true);
      try {
        const base = buildLiveExercises(day);
        const enriched = await enrichWithHistory(user.id, base);
        if (cancelled) return;
        setExercises(enriched);
      } catch {
        if (cancelled) return;
        // History is a convenience — fall back to the plan targets rather than
        // blocking the workout on it.
        setExercises(buildLiveExercises(day));
      } finally {
        if (!cancelled) {
          sessionStartedAt.current = Date.now();
          setElapsedSeconds(0);
          setBooting(false);
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [isLoading, day?.id, user?.id, plan?.id]);

  /** Release the row if the user walks away without finishing. */
  useEffect(() => {
    return () => {
      const id = sessionIdRef.current;
      if (id && !savedRef.current) void abandonSession(id);
    };
  }, []);

  useEffect(() => {
    if (booting || sessionStartedAt.current === null) return;
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartedAt.current!) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [booting]);

  useEffect(() => {
    if (!keyboardVisible) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [keyboardVisible]);

  const current = exercises[activeExerciseIndex];
  const currentSet = current?.sets[activeSetIndex];

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0
  );
  const flatSetIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < activeExerciseIndex; i++) idx += exercises[i]?.sets.length ?? 0;
    return idx + activeSetIndex;
  }, [exercises, activeExerciseIndex, activeSetIndex]);
  const progress = totalSets ? doneSets / totalSets : 0;
  const isLastSet =
    activeExerciseIndex === exercises.length - 1 &&
    activeSetIndex === (current?.sets.length ?? 1) - 1;
  const isFirstSet = activeExerciseIndex === 0 && activeSetIndex === 0;

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, patch: Partial<LiveExercise['sets'][0]>) => {
      setExercises((prev) =>
        prev.map((ex, i) => {
          if (i !== exIdx) return ex;
          const sets = ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s));
          return { ...ex, sets };
        })
      );
    },
    []
  );

  const goToNextSet = useCallback(() => {
    if (!current) return;
    if (activeSetIndex < current.sets.length - 1) {
      setActiveSetIndex((s) => s + 1);
    } else if (activeExerciseIndex < exercises.length - 1) {
      setActiveExerciseIndex((e) => e + 1);
      setActiveSetIndex(0);
    }
  }, [activeExerciseIndex, activeSetIndex, current, exercises.length]);

  const goToPrevSet = useCallback(() => {
    if (activeSetIndex > 0) {
      setActiveSetIndex((s) => s - 1);
      return;
    }
    if (activeExerciseIndex > 0) {
      const prevEx = exercises[activeExerciseIndex - 1];
      setActiveExerciseIndex((e) => e - 1);
      setActiveSetIndex(prevEx.sets.length - 1);
    }
  }, [activeExerciseIndex, activeSetIndex, exercises]);

  function completeCurrentSet() {
    if (!current || currentSet?.completed) return;
    updateSet(activeExerciseIndex, activeSetIndex, { completed: true });
    Keyboard.dismiss();
    // Open the session in the background so the row exists while the user
    // trains; a failure here is recoverable because finishing retries it.
    void ensureSession().catch(() => {});
    // Nothing left to rest for once the final set is in.
    if (!isLastSet) setRestOpen(true);
  }

  function onRestClose() {
    setRestOpen(false);
    if (!isLastSet) goToNextSet();
  }

  async function onFinish() {
    if (!user || !plan || !day || finishing) return;
    if (doneSets === 0) {
      Alert.alert('Nothing to save', 'Complete at least one set before finishing.');
      return;
    }
    setFinishing(true);
    try {
      const id = await ensureSession();
      const result = await complete.mutateAsync({
        sessionId: id,
        userId: user.id,
        exercises,
        dayCount: plan.plan_days.length,
        finishedDayIndex: day.day_index,
      });
      savedRef.current = true;
      setFinishedElapsed(formatElapsed(elapsedSeconds));
      setCompletion(result);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save workout');
    } finally {
      setFinishing(false);
    }
  }

  function confirmFinish() {
    Keyboard.dismiss();
    if (doneSets === 0) {
      Alert.alert('Nothing to save', 'Complete at least one set before finishing.');
      return;
    }
    const remaining = totalSets - doneSets;
    if (remaining <= 0) {
      onFinish();
      return;
    }
    Alert.alert(
      'Finish workout?',
      `${doneSets} of ${totalSets} sets logged. Your progress will be saved.`,
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Finish', style: 'destructive', onPress: onFinish },
      ]
    );
  }

  const confirmExit = useCallback(() => {
    if (doneSets > 0) {
      Keyboard.dismiss();
      Alert.alert(
        'Leave without saving?',
        `${doneSets} set${doneSets === 1 ? '' : 's'} logged will be lost. Use Finish workout to save.`,
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ]
      );
      return;
    }
    router.back();
  }, [doneSets, router]);

  /**
   * Android's back gesture would otherwise pop the player straight off the stack
   * and silently discard every logged set.
   */
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // The sheet owns back once the workout is saved; leaking through to
      // confirmExit would warn about losing sets that are already persisted.
      if (finishing || completion) return true;
      confirmExit();
      return true;
    });
    return () => sub.remove();
  }, [confirmExit, finishing, completion]);

  function jumpToExercise(exIdx: number) {
    setActiveExerciseIndex(exIdx);
    const firstIncomplete = exercises[exIdx]?.sets.findIndex((s) => !s.completed);
    setActiveSetIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
  }

  if (isLoading || booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (!day) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Workout not found.</Text>
        <PrimaryButton title="Go back" variant="ghost" onPress={() => router.back()} style={styles.errorBtn} />
      </View>
    );
  }

  if (!current || !currentSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>This day has no exercises yet.</Text>
        <PrimaryButton title="Go back" variant="ghost" onPress={() => router.back()} style={styles.errorBtn} />
      </View>
    );
  }

  const footerPad = Math.max(insets.bottom, theme.space.sm);
  const bottomPad = 72 + footerPad + keyboardPadding + theme.space.md;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Compact fixed header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={confirmExit} hitSlop={12}>
            <Text style={styles.back}>← Exit</Text>
          </Pressable>
          <Text style={styles.elapsed}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
        <Text style={styles.dayTitle}>{day.name}</Text>
        <Text style={styles.progressMeta}>
          Set {flatSetIndex + 1}/{totalSets} · {doneSets} done
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {/* One scroll — chips, exercise, inputs, nav (no flex dead zone) */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {exercises.map((ex, i) => {
            const done = ex.sets.every((s) => s.completed);
            const active = i === activeExerciseIndex;
            return (
              <Pressable
                key={ex.planExerciseId}
                onPress={() => jumpToExercise(i)}
                style={[
                  styles.exChip,
                  {
                    backgroundColor: active ? theme.colors.white : theme.colors.card,
                    borderColor: done ? theme.colors.borderStrong : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.exChipText, { color: active ? theme.colors.black : theme.colors.text }]}
                  numberOfLines={1}
                >
                  {ex.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.exName}>{current.name}</Text>
          <Text style={styles.exMeta}>
            {formatMuscles(current.primaryMuscles)} · {current.targetRepsMin}–{current.targetRepsMax} reps
            {current.previousBest
              ? ` · last ${current.previousBest.weight}×${current.previousBest.reps}`
              : ''}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.setLabel}>
            Set {currentSet.setNumber} of {current.sets.length}
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>kg</Text>
              <TextInput
                value={currentSet.weight}
                onChangeText={(t) =>
                  updateSet(activeExerciseIndex, activeSetIndex, {
                    weight: sanitizeWeightInput(t),
                  })
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                selectTextOnFocus
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>reps</Text>
              <TextInput
                value={currentSet.reps}
                onChangeText={(t) =>
                  updateSet(activeExerciseIndex, activeSetIndex, {
                    reps: sanitizeRepsInput(t),
                  })
                }
                keyboardType="number-pad"
                placeholder={String(currentSet.targetReps)}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                selectTextOnFocus
              />
            </View>
          </View>

          <Pressable
            onPress={() =>
              currentSet.completed
                ? updateSet(activeExerciseIndex, activeSetIndex, { completed: false })
                : completeCurrentSet()
            }
            style={[styles.completeBtn, currentSet.completed && styles.completeBtnDone]}
          >
            <Text style={[styles.completeBtnText, currentSet.completed && styles.completeBtnTextDone]}>
              {currentSet.completed ? 'Completed ✓' : 'Complete set'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.navRow}>
          <PrimaryButton
            title="Previous"
            variant="ghost"
            disabled={isFirstSet}
            onPress={goToPrevSet}
            style={styles.navBtn}
          />
          <PrimaryButton
            title="Next set"
            disabled={isLastSet}
            onPress={goToNextSet}
            style={styles.navBtn}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <PrimaryButton
          title="Finish workout"
          variant="ghost"
          onPress={confirmFinish}
          loading={finishing}
        />
      </View>

      <RestTimer
        visible={restOpen}
        seconds={restSec}
        onClose={onRestClose}
        onChangeDuration={setRestSec}
      />

      <WorkoutCompleteSheet
        visible={Boolean(completion)}
        result={completion}
        elapsedLabel={finishedElapsed}
        onDismiss={() => router.replace('/(app)/(tabs)')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: { ...theme.font.body, color: theme.colors.text },
  errorBtn: { marginTop: theme.space.md, minWidth: 160 },
  header: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.xs,
  },
  back: { ...theme.font.caption, color: theme.colors.textSecondary },
  elapsed: {
    ...theme.font.caption,
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  dayTitle: {
    ...theme.font.bodyMedium,
    fontSize: 17,
    color: theme.colors.text,
    marginBottom: 2,
  },
  progressMeta: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.xs },
  barTrack: { height: 2, backgroundColor: theme.colors.border, borderRadius: 1, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.white },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: theme.space.sm,
  },
  chipRow: {
    gap: theme.space.sm,
    paddingRight: theme.space.sm,
  },
  exChip: {
    borderWidth: theme.hairline,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
  },
  exChipText: { fontSize: 12, fontWeight: '500' },
  section: {
    marginBottom: theme.space.sm,
  },
  divider: {
    height: theme.hairline,
    backgroundColor: theme.colors.border,
    marginBottom: theme.space.md,
  },
  exName: {
    ...theme.font.title,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 2,
  },
  exMeta: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  setLabel: {
    ...theme.font.bodyMedium,
    color: theme.colors.text,
    marginBottom: theme.space.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  inputGroup: { flex: 1 },
  inputLabel: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: theme.space.md,
    fontSize: 22,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  completeBtn: {
    paddingVertical: 13,
    borderRadius: theme.radius.sm,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  completeBtnDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  completeBtnText: { ...theme.font.bodyMedium, color: theme.colors.text },
  completeBtnTextDone: { color: theme.colors.successOn },
  navRow: {
    flexDirection: 'row',
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  navBtn: { flex: 1 },
  footer: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
});
