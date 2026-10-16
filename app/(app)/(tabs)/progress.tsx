import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeRule } from '@/src/components/FadeRule';
import { BAND_COLORS, MuscleMap } from '@/src/components/MuscleMap';
import { SectionLabel } from '@/src/components/SectionLabel';
import { StatPill, StatRow } from '@/src/components/StatPill';
import {
  MUSCLE_BAND_FLOORS,
  muscleBand,
  muscleWeeklySets,
  percentChange,
  periodComparison,
  strengthTrends,
  weeklyTotals,
  type MuscleLookup,
} from '@/src/domain/analytics';
import { getExerciseById } from '@/src/domain/catalog';
import { anatomyLabel, MUSCLE_GROUPS, MUSCLE_LABELS } from '@/src/domain/muscles';
import { formatCount } from '@/src/domain/progression';
import type { MuscleGroup } from '@/src/domain/types';
import { useTrainingHistory } from '@/src/hooks/useAnalytics';

const WINDOWS = [
  { weeks: 1, label: '1 wk' },
  { weeks: 4, label: '4 wks' },
  { weeks: 12, label: '12 wks' },
] as const;
const CHART_WEEKS = 12;
const NO_HISTORY: never[] = [];

const lookup: MuscleLookup = (id) => {
  const ex = getExerciseById(id);
  return ex ? { primary: ex.primary_muscles, secondary: ex.secondary_muscles } : undefined;
};

const LEGEND = [
  { band: 'none', label: 'Not trained' },
  { band: 'low', label: `Under ${MUSCLE_BAND_FLOORS.building}` },
  { band: 'building', label: `${MUSCLE_BAND_FLOORS.building}–${MUSCLE_BAND_FLOORS.target}` },
  { band: 'target', label: `${MUSCLE_BAND_FLOORS.target}+` },
] as const;

function formatChange(change: number | null): string {
  if (change == null) return '—';
  const pct = Math.round(change * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
}

function formatSets(n: number): string {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { data: history, isLoading, error } = useTrainingHistory();
  const [weeks, setWeeks] = useState<number>(4);
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [weekIndex, setWeekIndex] = useState(CHART_WEEKS - 1);

  // Recomputed whenever fresh history lands, so "now" tracks the data.
  const now = useMemo(() => new Date(), [history]);
  const sessions = history ?? NO_HISTORY;

  const weekly = useMemo(() => muscleWeeklySets(sessions, lookup, { now, weeks }), [sessions, now, weeks]);
  const ranked = useMemo(
    () => [...MUSCLE_GROUPS].sort((a, b) => weekly[b] - weekly[a]),
    [weekly]
  );
  const comparison = useMemo(() => periodComparison(sessions, { now, weeks }), [sessions, now, weeks]);
  const chart = useMemo(() => weeklyTotals(sessions, { now, weeks: CHART_WEEKS }), [sessions, now]);
  const trends = useMemo(() => strengthTrends(sessions, { now, weeks, limit: 5 }), [sessions, now, weeks]);

  const chartMax = Math.max(...chart.map((w) => w.volume), 0);
  const barScale = Math.max(MUSCLE_BAND_FLOORS.target, weekly[ranked[0]] ?? 0);
  const windowName = weeks === 1 ? 'week' : `${weeks} weeks`;
  const picked = chart[weekIndex];

  const header = (
    <>
      <Text style={styles.kicker}>PROGRESS</Text>
      <Text style={styles.title}>Your training</Text>
    </>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error || sessions.length === 0) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18 }]}>
        {header}
        <EmptyState
          title={error ? 'Could not load your history' : 'Nothing to chart yet'}
          message={
            error
              ? 'Check your connection and pull this tab back into view to retry.'
              : 'Finish a workout and this tab maps the muscles you trained and tracks your progress.'
          }
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      {header}

      <View style={styles.segment} accessibilityRole="tablist">
        {WINDOWS.map((w) => {
          const on = w.weeks === weeks;
          return (
            <Pressable
              key={w.weeks}
              onPress={() => setWeeks(w.weeks)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.segmentItem, on && styles.segmentItemOn]}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{w.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Muscles trained</SectionLabel>
      <View style={styles.card}>
        <MuscleMap weeklySets={weekly} selected={muscle} onSelect={(m) => setMuscle(m === muscle ? null : m)} />

        <View style={styles.legend}>
          {LEGEND.map((l) => (
            <View key={l.band} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: BAND_COLORS[l.band] }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Average sets per week. Secondary muscles count as half a set.</Text>

        {muscle ? (
          <View style={styles.detail}>
            <Text style={styles.detailName}>
              {MUSCLE_LABELS[muscle]} · {formatSets(weekly[muscle])} sets/week
            </Text>
            <Text style={styles.detailSub}>{anatomyLabel(muscle)}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Tap a muscle for details.</Text>
        )}
      </View>

      <View style={styles.muscleList}>
        {ranked.map((m) => {
          const value = weekly[m];
          return (
            <Pressable
              key={m}
              onPress={() => setMuscle(m === muscle ? null : m)}
              accessibilityRole="button"
              accessibilityLabel={`${MUSCLE_LABELS[m]}, ${formatSets(value)} sets per week`}
              style={styles.muscleRow}
            >
              <Text style={[styles.muscleName, m === muscle && styles.muscleNameOn]}>{MUSCLE_LABELS[m]}</Text>
              <View style={styles.muscleTrack}>
                <View
                  style={[
                    styles.muscleFill,
                    { width: `${Math.min(100, (value / barScale) * 100)}%`, backgroundColor: BAND_COLORS[muscleBand(value)] },
                  ]}
                />
              </View>
              <Text style={styles.muscleValue}>{formatSets(value)}</Text>
            </Pressable>
          );
        })}
      </View>

      <FadeRule style={styles.rule} />

      <SectionLabel>{`Last ${windowName}`}</SectionLabel>
      <StatRow>
        <StatPill label="Workouts" value={comparison.current.workouts} showDivider />
        <StatPill label="Sets" value={formatCount(comparison.current.sets)} showDivider />
        <StatPill label="Volume kg" value={formatCount(Math.round(comparison.current.volume))} />
      </StatRow>
      <Text style={styles.note}>
        vs the {windowName} before: workouts{' '}
        {formatChange(percentChange(comparison.current.workouts, comparison.previous.workouts))} · sets{' '}
        {formatChange(percentChange(comparison.current.sets, comparison.previous.sets))} · volume{' '}
        {formatChange(percentChange(comparison.current.volume, comparison.previous.volume))}
      </Text>

      <SectionLabel style={styles.sectionGap}>Weekly volume</SectionLabel>
      {picked ? (
        <Text style={styles.readout}>
          Week of {picked.weekStart.getDate()}/{picked.weekStart.getMonth() + 1} · {picked.workouts} workout
          {picked.workouts === 1 ? '' : 's'} · {formatCount(Math.round(picked.volume))} kg
        </Text>
      ) : null}
      <View style={styles.chart} accessibilityLabel={`Weekly training volume for the last ${CHART_WEEKS} weeks`}>
        {chart.map((w, i) => {
          const h = chartMax > 0 ? Math.max(2, Math.round((w.volume / chartMax) * 100)) : 2;
          const on = i === weekIndex;
          return (
            <Pressable
              key={w.weekStart.toISOString()}
              onPress={() => setWeekIndex(i)}
              accessibilityRole="button"
              accessibilityLabel={`Week of ${w.weekStart.getDate()}/${w.weekStart.getMonth() + 1}, ${Math.round(w.volume)} kilograms`}
              style={styles.chartCol}
              hitSlop={4}
            >
              <View style={styles.chartBarWrap}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${h}%`, backgroundColor: on ? theme.colors.accent : BAND_COLORS.low },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel style={styles.sectionGap}>Strength</SectionLabel>
      {trends.length ? (
        <View>
          {trends.map((t) => (
            <View key={t.exerciseId} style={styles.trendRow}>
              <View style={styles.trendText}>
                <Text style={styles.trendName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.trendSub}>
                  {Math.round(t.start)} → {Math.round(t.latest)} kg · {t.sessions} sessions
                </Text>
              </View>
              <Text style={styles.trendChange}>{formatChange(t.change)}</Text>
            </View>
          ))}
          <Text style={styles.note}>
            Estimated one-rep max from your best set each session (Epley formula, sets of 12 reps or fewer).
          </Text>
        </View>
      ) : (
        <Text style={styles.note}>
          Log the same weighted lift in two sessions within this window to see its trend.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  kicker: { ...theme.font.kicker, color: theme.colors.accent, marginBottom: 10 },
  title: { ...theme.font.display, color: theme.colors.text, marginBottom: 18 },

  segment: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, borderWidth: theme.hairline, borderColor: theme.colors.border, padding: 3, marginBottom: 22 },
  segmentItem: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full },
  segmentItemOn: { backgroundColor: theme.colors.accentSoft },
  segmentText: { ...theme.font.mono, color: theme.colors.textMuted },
  segmentTextOn: { color: theme.colors.accentText },

  card: { ...theme.card, padding: 18 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { ...theme.font.small, color: theme.colors.textMuted },
  note: { ...theme.font.small, color: theme.colors.textDim, marginTop: 10 },
  hint: { ...theme.font.caption, color: theme.colors.textFaint, marginTop: 12, textAlign: 'center' },
  detail: { marginTop: 12, alignItems: 'center' },
  detailName: { ...theme.font.bodyMedium, color: theme.colors.text },
  detailSub: { ...theme.font.small, color: theme.colors.textDim, marginTop: 2, textAlign: 'center' },

  muscleList: { marginTop: 14, gap: 2 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 34 },
  muscleName: { ...theme.font.caption, color: theme.colors.textSecondary, width: 84 },
  muscleNameOn: { color: theme.colors.text, fontFamily: theme.fontFamily.semibold },
  muscleTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.track, overflow: 'hidden' },
  muscleFill: { height: 8, borderRadius: 4 },
  muscleValue: { ...theme.font.mono, color: theme.colors.textMuted, width: 34, textAlign: 'right' },

  rule: { marginTop: 18, marginBottom: 14 },
  sectionGap: { marginTop: 22 },
  readout: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 110 },
  chartCol: { flex: 1, height: '100%' },
  chartBarWrap: { flex: 1, justifyContent: 'flex-end' },
  chartBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, width: '100%' },

  trendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: theme.hairline, borderBottomColor: theme.colors.divider, gap: 12 },
  trendText: { flex: 1 },
  trendName: { ...theme.font.body, color: theme.colors.textSecondary },
  trendSub: { ...theme.font.monoSmall, color: theme.colors.textDim, marginTop: 2 },
  trendChange: { ...theme.font.mono, color: theme.colors.text },
});
