import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { useTabBarSpace } from '@/src/hooks/useTabBarSpace';
import { BrandKicker } from '@/src/components/BrandKicker';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeRule } from '@/src/components/FadeRule';
import { AnatomicalBodyMap, BAND_COLORS, BAND_TINT } from '@/src/components/AnatomicalBodyMap';
import { MuscleRadar } from '@/src/components/MuscleRadar';
import { TrainingHeatmap } from '@/src/components/TrainingHeatmap';
import { SectionLabel } from '@/src/components/SectionLabel';
import { StatPill, StatRow } from '@/src/components/StatPill';
import {
  MUSCLE_BAND_FLOORS,
  muscleBand,
  muscleWeeklySets,
  percentChange,
  periodComparison,
  strengthTrends,
  activitySummary,
  dailyActivity,
  trainingBalance,
  weeklyTotals,
  type MuscleLookup,
} from '@/src/domain/analytics';
import { BODY_MAP_BACKGROUND } from '@/src/domain/bodyMap';
import { getExerciseById } from '@/src/domain/catalog';
import { anatomyLabel, MUSCLE_GROUPS, MUSCLE_LABELS } from '@/src/domain/muscles';
import { formatCount, pluralWord } from '@/src/domain/progression';
import type { MuscleGroup } from '@/src/domain/types';
import { useTrainingHistory } from '@/src/hooks/useAnalytics';
import { themed } from '@/constants/themed';

/** Legend key matching the web's strokes. Drawn in SVG: one-sided dashed borders are unreliable on Android. */
function LegendLine({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <Svg width={18} height={4}>
      <Line x1={1} y1={2} x2={17} y2={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray={dashed ? '3 3' : undefined} />
    </Svg>
  );
}

const WINDOWS = [
  { weeks: 1, label: '1 wk' },
  { weeks: 4, label: '4 wks' },
  { weeks: 12, label: '12 wks' },
] as const;
const CHART_WEEKS = 12;
/** Calendar span; the history query covers 24 weeks, so this never shows days it has not loaded. */
const CALENDAR_WEEKS = 20;
const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
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
  const tabSpace = useTabBarSpace();
  const { data: history, isLoading, error } = useTrainingHistory();
  const [weeks, setWeeks] = useState<number>(4);
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [weekIndex, setWeekIndex] = useState(CHART_WEEKS - 1);

  // Recomputed whenever fresh history lands, so "now" tracks the data.
  const now = useMemo(() => new Date(), [history]);
  const sessions = history ?? NO_HISTORY;

  const weekly = useMemo(() => muscleWeeklySets(sessions, lookup, { now, weeks }), [sessions, now, weeks]);
  const previousWeekly = useMemo(
    () => muscleWeeklySets(sessions, lookup, { now, weeks, offset: 1 }),
    [sessions, now, weeks]
  );
  const balance = useMemo(() => trainingBalance(weekly), [weekly]);
  const calendar = useMemo(() => dailyActivity(sessions, { now, weeks: CALENDAR_WEEKS }), [sessions, now]);
  const activity = useMemo(() => activitySummary(calendar), [calendar]);
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
      <BrandKicker style={styles.kicker}>Progress</BrandKicker>
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
      <ScrollView style={styles.root} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: theme.space.xl + tabSpace }]}>
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
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: theme.space.xl + tabSpace }]}
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

      <SectionLabel>Training calendar</SectionLabel>
      <View style={[styles.card, styles.calendarCard]}>
        <TrainingHeatmap grid={calendar} />
        <View style={styles.balanceRow}>
          <View style={styles.balanceCell}>
            <Text style={styles.balanceValue}>{activity.activeDays}</Text>
            <Text style={styles.balanceLabel}>Active days</Text>
          </View>
          <View style={[styles.balanceCell, styles.balanceDivider]}>
            <Text style={styles.balanceValue}>{activity.currentRun}</Text>
            <Text style={styles.balanceLabel}>Week run</Text>
          </View>
          <View style={[styles.balanceCell, styles.balanceDivider]}>
            <Text style={styles.balanceValue}>{activity.bestRun}</Text>
            <Text style={styles.balanceLabel}>Best run</Text>
          </View>
        </View>
        <Text style={styles.note}>
          Last {CALENDAR_WEEKS} weeks. A run counts weeks with at least one workout, so planned rest days never break it.
          {activity.busiestWeekday != null ? ` You train most on ${WEEKDAYS[activity.busiestWeekday]}.` : ''}
        </Text>
      </View>

      <SectionLabel style={styles.sectionGap}>Muscles trained</SectionLabel>
      <View style={[styles.card, styles.mapCard]}>
        <AnatomicalBodyMap weeklySets={weekly} selected={muscle} onSelect={(m) => setMuscle(m === muscle ? null : m)} />

        <View style={styles.legend}>
          {LEGEND.map((l) => (
            <View key={l.band} style={styles.legendItem}>
              <View style={styles.swatch}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.accent, opacity: BAND_TINT[l.band] }]} />
              </View>
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Average sets per week. Secondary muscles count as half a set.</Text>

        {muscle ? (
          <View style={styles.detail}>
            <Text style={styles.detailName}>
              {MUSCLE_LABELS[muscle]} · {formatSets(weekly[muscle])} {pluralWord(weekly[muscle], 'set')}/week
            </Text>
            <Text style={styles.detailSub}>{anatomyLabel(muscle)}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Tap a muscle for details.</Text>
        )}
      </View>

      <SectionLabel style={styles.sectionGap}>Training balance</SectionLabel>
      <View style={styles.card}>
        <MuscleRadar current={weekly} previous={previousWeekly} selected={muscle} />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <LegendLine color={theme.colors.accent} />
            <Text style={styles.legendText}>Last {windowName}</Text>
          </View>
          <View style={styles.legendItem}>
            <LegendLine color={theme.colors.textFaint} dashed />
            <Text style={styles.legendText}>The {windowName} before</Text>
          </View>
          <View style={styles.legendItem}>
            <LegendLine color={theme.colors.accentDim} dashed />
            <Text style={styles.legendText}>{MUSCLE_BAND_FLOORS.target} sets/week</Text>
          </View>
        </View>
        <View style={styles.balanceRow}>
          <View style={styles.balanceCell}>
            <Text style={styles.balanceValue}>
              {balance.pullPerPush == null ? '—' : `${(Math.round(balance.pullPerPush * 10) / 10).toFixed(1)} : 1`}
            </Text>
            <Text style={styles.balanceLabel}>Pull : push</Text>
          </View>
          <View style={[styles.balanceCell, styles.balanceDivider]}>
            <Text style={styles.balanceValue}>{balance.lowerShare == null ? '—' : `${Math.round(balance.lowerShare * 100)}%`}</Text>
            <Text style={styles.balanceLabel}>Lower body</Text>
          </View>
          <View style={[styles.balanceCell, styles.balanceDivider]}>
            <Text style={styles.balanceValue}>{balance.covered}/{MUSCLE_GROUPS.length}</Text>
            <Text style={styles.balanceLabel}>Groups at 4+</Text>
          </View>
        </View>
        {balance.strongest && balance.weakest ? (
          <Text style={styles.note}>
            Most work: {MUSCLE_LABELS[balance.strongest]}. Least: {MUSCLE_LABELS[balance.weakest]}. An even web
            means the whole body is being trained; a pull : push near 1 : 1 keeps shoulders balanced.
          </Text>
        ) : null}
      </View>

      <View style={styles.muscleList}>
        {ranked.map((m) => {
          const value = weekly[m];
          return (
            <Pressable
              key={m}
              onPress={() => setMuscle(m === muscle ? null : m)}
              accessibilityRole="button"
              accessibilityLabel={`${MUSCLE_LABELS[m]}, ${formatSets(value)} ${pluralWord(value, 'set')} per week`}
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
        {comparison.previous.workouts > 0
          ? `vs the ${windowName} before: workouts ${formatChange(percentChange(comparison.current.workouts, comparison.previous.workouts))} · sets ${formatChange(percentChange(comparison.current.sets, comparison.previous.sets))} · volume ${formatChange(percentChange(comparison.current.volume, comparison.previous.volume))}`
          : `No workouts in the ${windowName} before this one yet, so there is nothing to compare against.`}
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

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: theme.space.lg, paddingBottom: theme.space.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  kicker: { marginBottom: 18 },
  title: { ...theme.font.display, color: theme.colors.text, marginBottom: 18 },

  segment: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, borderWidth: theme.hairline, borderColor: theme.colors.border, padding: 3, marginBottom: 22 },
  segmentItem: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full },
  segmentItemOn: { backgroundColor: theme.colors.accentSoft },
  segmentText: { ...theme.font.mono, color: theme.colors.textMuted },
  segmentTextOn: { color: theme.colors.accentText },

  card: { ...theme.card, padding: 18 },
  mapCard: { backgroundColor: BODY_MAP_BACKGROUND },
  calendarCard: { marginBottom: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  /** Artwork muscle grey under the band's violet tint, as on the map. */
  swatch: { width: 12, height: 12, borderRadius: 3, overflow: 'hidden', backgroundColor: '#c9cbd3' },
  legendText: { ...theme.font.small, color: theme.colors.textMuted },
  note: { ...theme.font.small, color: theme.colors.textDim, marginTop: 10 },
  balanceRow: { flexDirection: 'row', marginTop: 18, paddingTop: 16, borderTopWidth: theme.hairline, borderTopColor: theme.colors.divider },
  balanceCell: { flex: 1, alignItems: 'center' },
  balanceDivider: { borderLeftWidth: theme.hairline, borderLeftColor: theme.colors.divider },
  balanceValue: { ...theme.font.stat, fontSize: 20, lineHeight: 26, color: theme.colors.text },
  balanceLabel: { ...theme.font.kicker, fontSize: 9.5, color: theme.colors.textDim, marginTop: 4 },
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
}));
