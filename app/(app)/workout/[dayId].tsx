import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { formatTarget } from '@/src/components/DayWorkoutList';
import { ExerciseGuide } from '@/src/components/ExerciseGuide';
import { FadeRule } from '@/src/components/FadeRule';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { RestTimer } from '@/src/components/RestTimer';
import { WorkoutDialog, type WorkoutDialogState } from '@/src/components/WorkoutDialog';
import { WorkoutCompleteSheet } from '@/src/components/WorkoutCompleteSheet';
import {
  parseRepsValue,
  parseWeightValue,
  sanitizeRepsInput,
  sanitizeWeightInput,
} from '@/src/domain/liveWorkout';
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

const WEIGHT_STEP = 2.5;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "95" not "95.0", "92.5" not "92.50". */
function formatWeight(value: number): string {
  return String(Math.round(value * 100) / 100);
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
  const finishInFlight = useRef(false);
  const [dialog, setDialog] = useState<WorkoutDialogState | null>(null);
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
      if (savedRef.current) return;
      const id = sessionIdRef.current;
      if (id) {
        void abandonSession(id);
        return;
      }
      // Session create may still be in flight (first set just logged). Abandon
      // it once it resolves so we do not leave an orphaned in_progress row.
      const pending = pendingSession.current;
      if (pending) {
        void pending
          .then((createdId) => {
            if (!savedRef.current) return abandonSession(createdId);
          })
          .catch(() => {});
      }
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
  const progress = totalSets ? doneSets / totalSets : 0;
  const allDone = totalSets > 0 && doneSets === totalSets;
  const isLastSet =
    activeExerciseIndex === exercises.length - 1 &&
    activeSetIndex === (current?.sets.length ?? 1) - 1;

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

  /** What the rest timer is counting down to. */
  const nextLabel = useMemo(() => {
    if (!current) return '';
    if (activeSetIndex < current.sets.length - 1) {
      return `${current.name} · set ${activeSetIndex + 2}`;
    }
    const next = exercises[activeExerciseIndex + 1];
    return next ? next.name : 'Finish';
  }, [current, exercises, activeExerciseIndex, activeSetIndex]);

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

  function stepWeight(direction: 1 | -1) {
    if (!currentSet) return;
    const base = parseWeightValue(currentSet.weight) ?? 0;
    const next = Math.max(0, base + direction * WEIGHT_STEP);
    updateSet(activeExerciseIndex, activeSetIndex, { weight: formatWeight(next) });
  }

  function stepReps(direction: 1 | -1) {
    if (!currentSet) return;
    const base = parseRepsValue(currentSet.reps, currentSet.targetReps) ?? 0;
    const next = Math.max(0, base + direction);
    updateSet(activeExerciseIndex, activeSetIndex, { reps: String(next) });
  }

  async function onFinish() {
    if (finishInFlight.current || savedRef.current) return;
    if (!user || !plan || !day) {
      setDialog({ title: 'Workout not ready', message: 'Please wait for your workout to finish loading.' });
      return;
    }
    if (doneSets === 0) {
      setDialog({ title: 'Nothing to save', message: 'Log at least one set before finishing.' });
      return;
    }
    finishInFlight.current = true;
    setFinishing(true);
    setRestOpen(false);
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
      setDialog({ title: 'Could not save workout', message: e instanceof Error ? e.message : 'Your workout could not be saved. Your logged sets are still on this screen.' });
    } finally {
      finishInFlight.current = false;
      setFinishing(false);
    }
  }

  function confirmFinish() {
    if (finishInFlight.current || savedRef.current) return;
    Keyboard.dismiss();
    if (doneSets === 0) {
      setDialog({ title: 'Nothing to save', message: 'Log at least one set before finishing.' });
      return;
    }
    const remaining = totalSets - doneSets;
    if (remaining <= 0) {
      onFinish();
      return;
    }
    setDialog({
      title: 'Finish workout early?',
      message: `${doneSets} of ${totalSets} sets logged. Save these sets and finish? Unlogged sets will not be saved.`,
      confirmLabel: 'Save and finish',
      onConfirm: () => { void onFinish(); },
    });
  }

  const confirmExit = useCallback(() => {
    if (finishInFlight.current || savedRef.current) return;
    if (doneSets > 0) {
      Keyboard.dismiss();
      setDialog({
        title: 'Leave without saving?',
        message: `${doneSets} logged set${doneSets === 1 ? '' : 's'} will be lost. Use Finish and save to keep them.`,
        confirmLabel: 'Leave workout',
        destructive: true,
        onConfirm: () => router.back(),
      });
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
        <ActivityIndicator color={theme.colors.accent} />
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

  const bottomPad = Math.max(insets.bottom, theme.space.lg) + keyboardPadding;
  const target = formatTarget(current.targetSets, current.targetRepsMin, current.targetRepsMax);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={confirmExit}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Exit workout"
            style={({ pressed }) => [styles.exit, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="arrow-back" size={14} color={theme.colors.textMuted} />
            <Text style={styles.exitText}>Exit</Text>
          </Pressable>
          <Text style={styles.elapsed}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.dayTitle} numberOfLines={1}>{day.name}</Text>
          <Text style={styles.setsMeta}>{doneSets}/{totalSets} sets</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      <ScrollView
        horizontal
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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.exChip, (pressed || active) && styles.exChipActive]}
            >
              {active ? <View style={styles.activeDot} /> : null}
              {done ? (
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.accentDeep} />
              ) : null}
              <Text style={styles.exChipText} numberOfLines={1}>
                {ex.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.exName}>{current.name}</Text>
        <Text style={styles.exMeta}>
          {formatMuscles(current.primaryMuscles)} · {target}
          {current.previousBest
            ? ` · last ${current.previousBest.weight} × ${current.previousBest.reps}`
            : ''}
        </Text>

        <ExerciseGuide key={current.exerciseId} exerciseId={current.exerciseId} name={current.name} notes={current.notes} />

        <FadeRule style={styles.rule} />

        <View style={styles.setList}>
          {current.sets.map((s, j) => {
            const isCurrent = j === activeSetIndex;
            const value = s.completed
              ? `${s.weight || '—'} kg × ${s.reps || '—'}`
              : isCurrent
                ? `Logging ${s.weight || '0'} × ${s.reps || '0'}`
                : '—';
            return (
              <Pressable
                key={s.setNumber}
                onPress={() => setActiveSetIndex(j)}
                accessibilityRole="button"
                accessibilityLabel={`Set ${s.setNumber}, ${s.completed ? 'logged' : isCurrent ? 'current' : 'pending'}`}
                style={({ pressed }) => [styles.setRow, isCurrent && styles.setRowCurrent, pressed && styles.setRowPressed]}
              >
                <Text style={styles.setNum}>{s.setNumber}</Text>
                <Text style={[styles.setValue, !s.completed && !isCurrent && styles.setValueDim]}>{value}</Text>
                {s.completed ? (
                  <Ionicons name="checkmark" size={14} color={theme.colors.accent} />
                ) : isCurrent ? (
                  <Text style={styles.now}>NOW</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.logCard}>
          <View style={styles.inputs}>
            <View style={styles.weightGroup}>
              <Text style={styles.inputLabel}>Kilos</Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => stepWeight(-1)} accessibilityRole="button" accessibilityLabel="Less weight" style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
                  <Ionicons name="remove" size={14} color={theme.colors.textSecondary} />
                </Pressable>
                <TextInput
                  value={currentSet.weight}
                  onChangeText={(t) =>
                    updateSet(activeExerciseIndex, activeSetIndex, { weight: sanitizeWeightInput(t) })
                  }
                  editable={!currentSet.completed}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textFaint}
                  selectionColor={theme.colors.accent}
                  accessibilityLabel="Weight in kilos"
                  style={styles.figure}
                  selectTextOnFocus
                />
                <Pressable onPress={() => stepWeight(1)} accessibilityRole="button" accessibilityLabel="More weight" style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
                  <Ionicons name="add" size={14} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.repsGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => stepReps(-1)} accessibilityRole="button" accessibilityLabel="Fewer reps" style={({ pressed }) => [styles.stepBtn, styles.stepBtnNarrow, pressed && styles.stepBtnPressed]}>
                  <Ionicons name="remove" size={13} color={theme.colors.textSecondary} />
                </Pressable>
                <TextInput
                  value={currentSet.reps}
                  onChangeText={(t) =>
                    updateSet(activeExerciseIndex, activeSetIndex, { reps: sanitizeRepsInput(t) })
                  }
                  editable={!currentSet.completed}
                  keyboardType="number-pad"
                  placeholder={String(currentSet.targetReps)}
                  placeholderTextColor={theme.colors.textFaint}
                  selectionColor={theme.colors.accent}
                  accessibilityLabel="Reps"
                  style={styles.figure}
                  selectTextOnFocus
                />
                <Pressable onPress={() => stepReps(1)} accessibilityRole="button" accessibilityLabel="More reps" style={({ pressed }) => [styles.stepBtn, styles.stepBtnNarrow, pressed && styles.stepBtnPressed]}>
                  <Ionicons name="add" size={13} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>

          {currentSet.completed ? (
            <PrimaryButton
              title={`Unlog set ${currentSet.setNumber}`}
              variant="ghost"
              onPress={() => updateSet(activeExerciseIndex, activeSetIndex, { completed: false })}
              style={styles.logBtn}
            />
          ) : (
            <PrimaryButton
              title={`Log set ${currentSet.setNumber}`}
              icon={<Ionicons name="checkmark" size={15} color={theme.colors.accentText} />}
              onPress={completeCurrentSet}
              style={styles.logBtn}
            />
          )}
        </View>

        {allDone ? (
          <PrimaryButton
            title="Finish workout"
            variant="filled"
            onPress={confirmFinish}
            loading={finishing}
            style={styles.finish}
          />
        ) : null}
        <PrimaryButton
          title="Finish and save"
          variant="link"
          onPress={confirmFinish}
          loading={finishing && !allDone}
          style={styles.finishLink}
        />
      </ScrollView>

      <WorkoutDialog dialog={dialog} onClose={() => setDialog(null)} />

      <RestTimer
        visible={restOpen}
        seconds={restSec}
        nextLabel={nextLabel}
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
    padding: theme.space.lg,
  },
  errorText: { ...theme.font.body, color: theme.colors.text },
  errorBtn: { marginTop: theme.space.md, minWidth: 160 },

  header: { paddingHorizontal: theme.space.lg, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 30,
  },
  exit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exitText: { ...theme.font.body, fontSize: 13, color: theme.colors.textMuted },
  elapsed: { ...theme.font.mono, fontSize: 13, color: theme.colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  dayTitle: { ...theme.font.heading, color: theme.colors.text, flex: 1 },
  setsMeta: { ...theme.font.monoSmall, fontSize: 11.5, color: theme.colors.textDim },
  barTrack: { height: 2, backgroundColor: theme.colors.track, borderRadius: 1, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 2, borderRadius: 1, backgroundColor: theme.colors.accent, ...theme.shadow.glow },

  chipScroll: { flexGrow: 0 },
  chipRow: { gap: 7, paddingHorizontal: theme.space.lg, paddingTop: 6, paddingBottom: 12 },
  exChip: {
    ...theme.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: 150,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  exChipActive: { borderColor: theme.colors.accentDim },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.accent, ...theme.shadow.glow },
  exChipText: { ...theme.font.bodyMedium, fontSize: 12, lineHeight: 15, color: theme.colors.textSecondary, flexShrink: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: theme.space.lg },
  exName: { ...theme.font.title, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: theme.colors.text },
  exMeta: { ...theme.font.small, fontSize: 12, lineHeight: 18, color: theme.colors.textDim, marginTop: 3 },
  rule: { marginTop: 18, marginBottom: 14 },

  setList: { gap: 6 },
  setRow: {
    ...theme.card,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
  },
  setRowCurrent: { borderColor: theme.colors.borderStrong },
  setRowPressed: { borderColor: theme.colors.accentDim },
  setNum: { ...theme.font.mono, color: theme.colors.textDim, width: 18 },
  setValue: { ...theme.font.bodyMedium, color: theme.colors.textSecondary, flex: 1, fontVariant: ['tabular-nums'] },
  setValueDim: { color: theme.colors.textFaint },
  now: { ...theme.font.kicker, letterSpacing: 0.8, color: theme.colors.accent },

  logCard: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    ...theme.shadow.md,
  },
  inputs: { flexDirection: 'row', gap: 11 },
  weightGroup: { flex: 1 },
  repsGroup: { width: 112 },
  inputLabel: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnNarrow: { width: 32 },
  stepBtnPressed: { borderColor: theme.colors.accentDim },
  figure: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    ...theme.font.figure,
    color: theme.colors.text,
    paddingVertical: 4,
  },
  logBtn: { marginTop: 14 },

  finish: { marginTop: 16 },
  finishLink: { marginTop: 6 },
});
