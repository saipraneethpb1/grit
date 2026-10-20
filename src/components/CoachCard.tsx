import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { Decision, Prescription } from '@/src/domain/coach';
import { themed } from '@/constants/themed';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const DECISIONS = themed((): Record<Decision, { icon: IconName; label: string; color: string }> => ({
  progress: { icon: 'trending-up', label: 'Progress', color: theme.colors.success },
  repeat: { icon: 'repeat', label: 'Consolidate', color: theme.colors.accentText },
  reps: { icon: 'add-circle-outline', label: 'More reps', color: theme.colors.accentText },
  reset: { icon: 'refresh', label: 'Reset', color: theme.colors.warning },
  'ease-in': { icon: 'leaf-outline', label: 'Ease in', color: theme.colors.info },
  start: { icon: 'flag-outline', label: 'First time', color: theme.colors.accentText },
}));

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
}

/**
 * The coach's call for this exercise today: load and reps, effort as reps in
 * reserve, rest, and warm-ups. Tap to read why.
 */
export function CoachCard({ prescription: rx }: { prescription: Prescription }) {
  const [open, setOpen] = useState(false);
  const d = DECISIONS[rx.decision];
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`Coach: ${rx.headline}. ${open ? rx.reason : 'Tap for why.'}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={[styles.badge, { borderColor: d.color }]}>
          <Ionicons name={d.icon} size={12} color={d.color} />
          <Text style={[styles.badgeText, { color: d.color }]}>{d.label}</Text>
        </View>
        <Text style={styles.coach}>COACH</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textFaint} />
      </View>
      <Text style={styles.headline}>{rx.headline}</Text>

      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factValue}>{rx.rir}</Text>
          <Text style={styles.factLabel}>Reps in reserve</Text>
        </View>
        <View style={[styles.fact, styles.factDivider]}>
          <Text style={styles.factValue}>{rx.lastSetRir}</Text>
          <Text style={styles.factLabel}>On last set</Text>
        </View>
        <View style={[styles.fact, styles.factDivider]}>
          <Text style={styles.factValue}>{formatRest(rx.restSeconds)}</Text>
          <Text style={styles.factLabel}>Rest</Text>
        </View>
      </View>

      {rx.warmup.length ? (
        <View style={styles.warmup}>
          <Text style={styles.warmupLabel}>Warm-up</Text>
          <Text style={styles.warmupSets}>{rx.warmup.map((w) => `${w.weight} × ${w.reps}`).join('   ·   ')}</Text>
        </View>
      ) : null}

      {open ? <Text style={styles.reason}>{rx.reason}</Text> : null}
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { ...theme.card, backgroundColor: theme.colors.surfaceTint, borderColor: theme.colors.borderTint, padding: 16, marginTop: 14, marginBottom: 4 },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: theme.hairline, borderRadius: theme.radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { ...theme.font.kicker, fontSize: 9.5, lineHeight: 12, letterSpacing: 1.2 },
  coach: { ...theme.font.kicker, fontSize: 9.5, color: theme.colors.textFaint, flex: 1, textAlign: 'right' },
  headline: { ...theme.font.heading, fontSize: 17, lineHeight: 23, color: theme.colors.text, marginTop: 10 },
  facts: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: theme.hairline, borderTopColor: theme.colors.borderTint },
  fact: { flex: 1, alignItems: 'center' },
  factDivider: { borderLeftWidth: theme.hairline, borderLeftColor: theme.colors.borderTint },
  factValue: { ...theme.font.stat, fontSize: 18, lineHeight: 22, color: theme.colors.text },
  factLabel: { ...theme.font.kicker, fontSize: 8.5, lineHeight: 11, color: theme.colors.textDim, marginTop: 4, letterSpacing: 1 },
  warmup: { marginTop: 12, paddingTop: 12, borderTopWidth: theme.hairline, borderTopColor: theme.colors.borderTint },
  warmupLabel: { ...theme.font.kicker, fontSize: 9, color: theme.colors.textDim },
  warmupSets: { ...theme.font.mono, color: theme.colors.textSecondary, marginTop: 6 },
  reason: { ...theme.font.caption, color: theme.colors.textSecondary, marginTop: 12 },
}));
