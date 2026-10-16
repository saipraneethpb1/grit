import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_DESCRIPTION_LENGTH } from '@/supabase/functions/_shared/planIntentQuestions';
import { theme } from '@/constants/theme';
import { FadeRule } from '@/src/components/FadeRule';
import { LevelBadge } from '@/src/components/LevelBadge';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { EXERCISES, getSplitTemplate } from '@/src/domain/catalog';
import { getMethodology, METHODOLOGIES, type MethodologyId } from '@/src/domain/methodologies';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import {
  DAY_CHOICES,
  encodeEquipmentParam,
  EQUIPMENT_LABELS,
  filterCatalogForEquipment,
  INTENT_EQUIPMENT,
  pickSplitFor,
  type PlanIntent,
} from '@/src/domain/planIntent';
import type { Equipment } from '@/src/domain/types';
import { usePlanIntent } from '@/src/hooks/usePlanIntent';

const EXAMPLES = [
  'Four days a week at home with dumbbells. I want bigger arms and shoulders.',
  'Complete beginner, commercial gym, three days a week.',
  'Five days at the gym. My lower back gets cranky with heavy deadlifts.',
];

type Draft = { methodologyId: MethodologyId; daysPerWeek: number; equipment: Equipment[] };

/** "Check this" marker for fields the model was unsure about. */
function CheckTag() {
  return (
    <View style={styles.checkTag}>
      <Text style={styles.checkTagText}>Check this</Text>
    </View>
  );
}

export default function DescribeWeekScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const read = usePlanIntent();
  const [description, setDescription] = useState('');
  const [intent, setIntent] = useState<PlanIntent | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [stylesOpen, setStylesOpen] = useState(false);

  const trimmed = description.trim();
  const methodology = draft ? getMethodology(draft.methodologyId) : undefined;
  const templateId = methodology && draft ? pickSplitFor(methodology, draft.daysPerWeek) : null;
  const split = templateId ? getSplitTemplate(templateId) : undefined;

  const fallbackMuscles = useMemo(() => {
    if (!draft || !templateId) return [];
    return filterCatalogForEquipment(EXERCISES, draft.equipment, templateId).fallbackMuscles;
  }, [draft, templateId]);

  async function onRead() {
    if (!trimmed || read.isPending) return;
    setIntent(null);
    setDraft(null);
    setStylesOpen(false);
    try {
      const result = await read.mutateAsync(trimmed);
      setIntent(result);
      setDraft({
        methodologyId: result.methodologyId,
        daysPerWeek: result.daysPerWeek,
        equipment: result.equipment,
      });
      setStylesOpen(result.uncertain.includes('style'));
    } catch {
      // The mutation holds the message; the error block renders it.
    }
  }

  function toggleEquipment(id: Equipment) {
    setDraft((d) =>
      d
        ? {
            ...d,
            equipment: d.equipment.includes(id)
              ? d.equipment.filter((e) => e !== id)
              : [...d.equipment, id],
          }
        : d
    );
  }

  function openPreview() {
    if (!draft || !templateId) return;
    router.push(
      `/(app)/splits/preview?templateId=${templateId}&methodologyId=${draft.methodologyId}&equipment=${encodeEquipmentParam(draft.equipment)}` as never
    );
  }

  const note = (field: 'style' | 'days' | 'equipment', defaultText: string) => {
    if (!intent) return null;
    if (intent.uncertain.includes(field)) return <CheckTag />;
    if (!intent.stated[field]) return <Text style={styles.defaultNote}>{defaultText}</Text>;
    return null;
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, theme.space.lg) + theme.space.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>In your own words</Text>
        <Text style={styles.title}>How do you want to train?</Text>
        <Text style={styles.lead}>
          Say how often you can train, where, with what, and what you are after. We turn it into a program you can check before anything is saved.
        </Text>

        <TextInput
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, MAX_DESCRIPTION_LENGTH))}
          placeholder="e.g. Four days a week at home with dumbbells…"
          placeholderTextColor={theme.colors.textFaint}
          selectionColor={theme.colors.accent}
          accessibilityLabel="Describe how you want to train"
          multiline
          textAlignVertical="top"
          maxLength={MAX_DESCRIPTION_LENGTH}
          style={styles.input}
        />
        <View style={styles.inputMeta}>
          <Text style={styles.privacy}>Only this text is sent to TypeSafe to read it.</Text>
          <Text style={styles.count}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>

        {!trimmed ? (
          <View style={styles.examples}>
            {EXAMPLES.map((example) => (
              <Pressable
                key={example}
                onPress={() => setDescription(example)}
                accessibilityRole="button"
                accessibilityLabel={`Use example: ${example}`}
                style={({ pressed }) => [styles.example, pressed && styles.examplePressed]}
              >
                <Text style={styles.exampleText}>{example}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <PrimaryButton
          title={intent ? 'Read it again' : 'Build my week'}
          variant={intent ? 'ghost' : 'primary'}
          icon={intent ? undefined : <Ionicons name="sparkles-outline" size={15} color={theme.colors.accentText} />}
          onPress={onRead}
          loading={read.isPending}
          disabled={!trimmed}
          style={styles.readBtn}
        />

        {read.isError ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>
              {read.error instanceof Error ? read.error.message : 'Something went wrong.'}
            </Text>
            <PrimaryButton
              title="Pick a program by hand"
              variant="link"
              onPress={() => router.replace('/(app)/splits')}
            />
          </View>
        ) : null}

        {intent && draft && methodology && split ? (
          <View>
            <FadeRule style={styles.rule} />
            <Text style={styles.kicker}>Here is what we read</Text>

            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>Training style</Text>
                {note('style', 'Not mentioned, so the beginner default')}
              </View>
              <Pressable
                onPress={() => setStylesOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: stylesOpen }}
                accessibilityLabel={`Training style: ${methodology.name}. Change`}
                style={({ pressed }) => [styles.valueCard, pressed && styles.examplePressed]}
              >
                <View style={styles.valueBody}>
                  <Text style={styles.valueTitle}>{methodology.name}</Text>
                  <Text style={styles.valueNote}>{methodology.tagline}</Text>
                </View>
                <LevelBadge level={methodology.level} />
                <Ionicons name={stylesOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textDim} />
              </Pressable>
              {stylesOpen ? (
                <View style={styles.styleList}>
                  {METHODOLOGIES.map((m) => {
                    const on = m.id === draft.methodologyId;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          setDraft({ ...draft, methodologyId: m.id });
                          setStylesOpen(false);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.styleRow, on && styles.styleRowOn]}
                      >
                        <View style={styles.radio}>{on ? <View style={styles.radioDot} /> : null}</View>
                        <Text style={styles.styleName}>{m.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>Days a week</Text>
                {note('days', 'Not mentioned, so the style default')}
              </View>
              <View style={styles.pills}>
                {DAY_CHOICES.map((d) => {
                  const on = d === draft.daysPerWeek;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDraft({ ...draft, daysPerWeek: d })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${d} days a week`}
                      style={[styles.pill, on && styles.pillOn]}
                    >
                      <Text style={[styles.pillText, on && styles.pillTextOn]}>{d}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.splitNote}>
                {split.name} · {split.days_per_week} days
              </Text>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>Equipment</Text>
                {note('equipment', 'Not mentioned, so a full gym')}
              </View>
              <View style={styles.chips}>
                <View style={[styles.chip, styles.chipOn, styles.chipLocked]}>
                  <Text style={[styles.chipText, styles.chipTextOn]}>{EQUIPMENT_LABELS.bodyweight}</Text>
                </View>
                {INTENT_EQUIPMENT.map((id) => {
                  const on = draft.equipment.includes(id);
                  const unsure = intent.uncertainEquipment.includes(id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleEquipment(id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${EQUIPMENT_LABELS[id]}${unsure ? ', please check' : ''}`}
                      style={[styles.chip, on && styles.chipOn, unsure && styles.chipUnsure]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {EQUIPMENT_LABELS[id]}
                        {unsure ? ' ?' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fallbackMuscles.length ? (
                <Text style={styles.fallback}>
                  Your kit has no movement for {fallbackMuscles.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(', ')}, so those days use gym equipment. Add kit above to change that.
                </Text>
              ) : null}
            </View>

            <PrimaryButton
              title="Preview program"
              icon={<Ionicons name="arrow-forward" size={15} color={theme.colors.accentText} />}
              onPress={openPreview}
              style={styles.previewBtn}
            />
            <Text style={styles.footnote}>Nothing is saved until you start the program on the next screen.</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 22, paddingTop: 22 },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 12 },
  title: { ...theme.font.hero, color: theme.colors.text, marginBottom: 10 },
  lead: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: 22 },

  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    minHeight: 120,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 12,
    ...theme.font.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.colors.text,
  },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 7 },
  privacy: { ...theme.font.small, color: theme.colors.textFaint, flex: 1 },
  count: { ...theme.font.monoSmall, color: theme.colors.textFaint },

  examples: { gap: 7, marginTop: 16 },
  example: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  examplePressed: { borderColor: theme.colors.accentDim },
  exampleText: { ...theme.font.caption, color: theme.colors.textMuted },

  readBtn: { marginTop: 16, minHeight: 50 },
  errorBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  errorText: { ...theme.font.body, color: theme.colors.textSecondary },

  rule: { marginTop: 22, marginBottom: 18 },
  field: { marginBottom: 20 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  fieldLabel: { ...theme.font.kicker, color: theme.colors.textDim },
  defaultNote: { ...theme.font.small, fontSize: 11, color: theme.colors.textFaint, flexShrink: 1, textAlign: 'right' },
  checkTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  checkTagText: { ...theme.font.monoSmall, fontSize: 10.5, fontWeight: '500', color: theme.colors.accentText },

  valueCard: { ...theme.card, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  valueBody: { flex: 1, minWidth: 0 },
  valueTitle: { ...theme.font.bodyMedium, color: theme.colors.text },
  valueNote: { ...theme.font.small, color: theme.colors.textDim, marginTop: 2 },
  styleList: { marginTop: 6, gap: 6 },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
  },
  styleRowOn: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  styleName: { ...theme.font.body, color: theme.colors.textSecondary, flex: 1 },

  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
  },
  pillOn: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  pillText: { ...theme.font.stat, fontSize: 17, color: theme.colors.textMuted },
  pillTextOn: { color: theme.colors.accentText },
  splitNote: { ...theme.font.small, color: theme.colors.textDim, marginTop: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
  },
  chipOn: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  chipLocked: { opacity: 0.7 },
  chipUnsure: { borderStyle: 'dashed', borderColor: theme.colors.accentBright },
  chipText: { ...theme.font.bodyMedium, fontSize: 12.5, color: theme.colors.textMuted },
  chipTextOn: { color: theme.colors.accentText },
  fallback: { ...theme.font.small, color: theme.colors.textDim, marginTop: 10 },

  previewBtn: { minHeight: 50, marginTop: 4 },
  footnote: { ...theme.font.small, color: theme.colors.textFaint, textAlign: 'center', marginTop: 10 },
});
