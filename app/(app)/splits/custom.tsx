import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { buildCustomProgram, moveItem, newCustomDay, type CustomDraft, type CustomLift } from '@/src/domain/customProgram';
import { getExerciseById } from '@/src/domain/catalog';
import { useExerciseLibrary } from '@/src/hooks/useExercises';
import { useSavePlan } from '@/src/hooks/usePlans';

export default function CustomProgramScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const pendingExit = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  const save = useSavePlan();
  const scroll = useRef<ScrollView>(null);
  const saving = useRef(false);
  const [draft, setDraft] = useState<CustomDraft>({ name: '', days: [newCustomDay(0)] });
  const [step, setStep] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [picker, setPicker] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [error, setError] = useState('');
  const { exercises, search, setSearch } = useExerciseLibrary();
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (allowExit.current) return;
    event.preventDefault();
    if (saving.current) return;
    pendingExit.current = () => navigation.dispatch(event.data.action);
    setExitOpen(true);
  }), [navigation]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const warn = (event: BeforeUnloadEvent) => { if (!allowExit.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const day = draft.days[dayIndex];
  const go = (next: number) => { setError(''); setStep(next); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const back = () => { if (saving.current) return; if (step > 0) go(step - 1); else setExitOpen(true); };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [step]);
  const updateDay = (patch: Partial<typeof day>) => setDraft(current => ({ ...current, days: current.days.map((item, index) => index === dayIndex ? { ...item, ...patch } : item) }));
  const updateLift = (index: number, patch: Partial<CustomLift>) => updateDay({ exercises: day.exercises.map((lift, i) => i === index ? { ...lift, ...patch } : lift) });

  function review() {
    try { buildCustomProgram(draft); go(2); } catch (err) { setError((err as Error).message); }
  }
  async function activate() {
    if (saving.current) return;
    saving.current = true;
    setError('');
    try {
      await save.mutateAsync(buildCustomProgram(draft));
      allowExit.current = true;
      router.replace('/(app)/(tabs)');
    } catch {
      setError('Could not save your program. Your draft is still here. Try again.');
    } finally { saving.current = false; }
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <PrimaryButton title={step ? 'Back' : 'Cancel'} variant="link" onPress={back} disabled={save.isPending} />
        <Text style={styles.stepLabel}>Step {step + 1} of 3</Text>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{['Your program', 'Build your days', 'Review your program'][step]}</Text>
        <Text style={styles.body}>{['Add the training days you follow. Take rest days between sessions as needed.', 'Choose exercises in workout order, then set your sets and rep ranges.', 'This becomes your active program. Your previous workout history stays saved.'][step]}</Text>
        {step === 0 ? <>
          <Text style={styles.label}>Program name</Text>
          <TextInput accessibilityLabel="Program name" style={styles.input} placeholder="e.g. My push / pull / legs" placeholderTextColor={theme.colors.textDim} maxLength={120} value={draft.name} onChangeText={name => setDraft({ ...draft, name })} />
          {draft.days.map((item, index) => <View key={index} style={styles.card}>
            <Text style={styles.label}>Training day {index + 1}</Text>
            <TextInput accessibilityLabel={`Day ${index + 1} name`} style={styles.input} maxLength={80} value={item.name} onChangeText={name => setDraft({ ...draft, days: draft.days.map((d, i) => i === index ? { ...d, name } : d) })} />
            <View style={styles.row}>
              <PrimaryButton title="Move up" variant="ghost" disabled={index === 0} onPress={() => setDraft({ ...draft, days: moveItem(draft.days, index, -1) })} style={styles.flex} />
              <PrimaryButton title="Remove day" variant="danger" disabled={draft.days.length === 1} onPress={() => { setDraft({ ...draft, days: draft.days.filter((_, i) => i !== index) }); setDayIndex(0); }} style={styles.flex} />
            </View>
          </View>)}
          <PrimaryButton title="Add training day" variant="ghost" disabled={draft.days.length >= 7} onPress={() => setDraft({ ...draft, days: [...draft.days, newCustomDay(draft.days.length)] })} />
        </> : null}
        {step === 1 ? <>
          <ScrollView horizontal contentContainerStyle={styles.tabs}>
            {draft.days.map((item, index) => <Pressable key={index} accessibilityRole="tab" accessibilityState={{ selected: index === dayIndex }} onPress={() => { setDayIndex(index); setError(''); }} style={[styles.tab, index === dayIndex && styles.selected]}><Text style={styles.label}>{item.name} · {item.exercises.length}</Text></Pressable>)}
          </ScrollView>
          {!day.exercises.length ? <Text style={styles.body}>No exercises yet. Add your first movement below.</Text> : null}
          {day.exercises.map((lift, index) => <View key={`${lift.exerciseId}-${index}`} style={styles.card}>
            <Text style={styles.label}>{index + 1}. {getExerciseById(lift.exerciseId)?.name}</Text>
            <View style={styles.row}>
              {(['sets', 'minReps', 'maxReps'] as const).map((field, i) => <View key={field} style={styles.flex}>
                <Text style={styles.body}>{['Sets', 'Min reps', 'Max reps'][i]}</Text>
                <TextInput accessibilityLabel={`${getExerciseById(lift.exerciseId)?.name} ${['sets', 'minimum reps', 'maximum reps'][i]}`} style={styles.input} keyboardType="number-pad" maxLength={3} value={lift[field]} onChangeText={value => updateLift(index, { [field]: value.replace(/\D/g, '') })} />
              </View>)}
            </View>
            <View style={styles.row}>
              <PrimaryButton title="Move up" variant="ghost" disabled={!index} onPress={() => updateDay({ exercises: moveItem(day.exercises, index, -1) })} style={styles.flex} />
              <PrimaryButton title="Remove" variant="danger" onPress={() => updateDay({ exercises: day.exercises.filter((_, i) => i !== index) })} style={styles.flex} />
            </View>
          </View>)}
          <PrimaryButton title="Add exercise" variant="ghost" disabled={day.exercises.length >= 30} onPress={() => { setSearch(''); setPicker(true); }} />
          {dayIndex < draft.days.length - 1 ? <PrimaryButton title={`Next day: ${draft.days[dayIndex + 1].name}`} variant="ghost" style={{ marginTop: 12 }} onPress={() => setDayIndex(dayIndex + 1)} /> : null}
        </> : null}
        {step === 2 ? <>
          <Text style={styles.title}>{draft.name.trim()}</Text>
          {draft.days.map((item, index) => <View key={index} style={styles.card}>
            <Text style={styles.label}>{index + 1}. {item.name.trim()}</Text>
            {item.exercises.map((lift, i) => <Text key={i} style={styles.body}>{getExerciseById(lift.exerciseId)?.name} · {lift.sets} × {lift.minReps === lift.maxReps ? lift.minReps : `${lift.minReps}–${lift.maxReps}`}</Text>)}
            <PrimaryButton title="Edit day" variant="ghost" onPress={() => { setDayIndex(index); go(1); }} disabled={save.isPending} />
          </View>)}
        </> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

        <PrimaryButton title={['Choose exercises', 'Review program', 'Start this program'][step]} loading={save.isPending} onPress={() => {
          if (step === 0) {
            if (!draft.name.trim() || draft.days.some(d => !d.name.trim())) { setError('Name your program and each training day.'); return; }
            setDayIndex(0); go(1);
          } else if (step === 1) review(); else void activate();
        }} />
      </View>
      <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}><Text style={styles.label}>Add to {day.name}</Text><PrimaryButton title="Done" variant="link" onPress={() => setPicker(false)} /></View>
          <TextInput accessibilityLabel="Search exercises" style={[styles.input, { marginHorizontal: theme.space.lg, marginBottom: 8 }]} placeholder="Search name, muscle, or equipment" placeholderTextColor={theme.colors.textDim} value={search} onChangeText={setSearch} autoCorrect={false} />
          <FlatList data={exercises} keyboardShouldPersistTaps="handled" keyExtractor={item => item.id} ListEmptyComponent={<Text style={styles.body}>No exercises found. Try another search.</Text>} renderItem={({ item }) => {
            const added = day.exercises.some(lift => lift.exerciseId === item.id);
            return <Pressable accessibilityRole="button" accessibilityLabel={`${added ? 'Added' : 'Add'} ${item.name}`} accessibilityState={{ disabled: added || day.exercises.length >= 30 }} disabled={added || day.exercises.length >= 30} style={styles.result} onPress={() => updateDay({ exercises: [...day.exercises, { exerciseId: item.id, sets: String(item.default_sets), minReps: String(item.default_reps_min), maxReps: String(item.default_reps_max) }] })}>
              <Text style={styles.label}>{item.name}</Text><Text style={styles.body}>{added ? 'Added ✓' : item.equipment.join(', ').replace(/_/g, ' ')}</Text>
            </Pressable>;
          }} />
        </View>
      </Modal>
      <Modal visible={exitOpen} transparent animationType="fade" onRequestClose={() => setExitOpen(false)}>
        <View style={styles.overlay}><View style={styles.dialog}>
          <Text style={styles.title}>Discard this draft?</Text><Text style={styles.body}>Your program has not been saved.</Text>
          <PrimaryButton title="Keep editing" onPress={() => setExitOpen(false)} />
          <PrimaryButton title="Discard draft" variant="danger" onPress={() => { allowExit.current = true; setExitOpen(false); if (pendingExit.current) pendingExit.current(); else router.back(); }} />
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.space.lg, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  content: { paddingHorizontal: theme.space.lg, paddingTop: 8, paddingBottom: theme.space.lg, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { ...theme.font.hero, color: theme.colors.text },
  stepLabel: { ...theme.font.kicker, color: theme.colors.accentDeep },
  body: { ...theme.font.caption, color: theme.colors.textMuted, marginVertical: 4 },
  label: { ...theme.font.bodyMedium, color: theme.colors.text },
  input: { minHeight: 44, borderRadius: theme.radius.md, borderWidth: theme.hairline, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 10, ...theme.font.body, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  card: { ...theme.card, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
  tabs: { gap: 7 }, tab: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: theme.hairline, borderColor: theme.colors.border, borderRadius: theme.radius.md }, selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  footer: { paddingHorizontal: theme.space.lg, paddingTop: 12, borderTopWidth: theme.hairline, borderColor: theme.colors.divider, gap: 10 },
  error: { ...theme.font.caption, color: theme.colors.danger },
  result: { paddingVertical: 13, paddingHorizontal: theme.space.lg, borderBottomWidth: theme.hairline, borderColor: theme.colors.divider },
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: theme.colors.backdrop },
  dialog: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: theme.hairline, borderColor: theme.colors.borderStrong, padding: 22, gap: 12 },
});
