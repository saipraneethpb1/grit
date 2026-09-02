import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { AchievementBadge } from '@/src/components/AchievementBadge';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { XpBar } from '@/src/components/XpBar';
import { formatCount, type WorkoutCompletionResult } from '@/src/domain/progression';

type Props = {
  visible: boolean;
  result: WorkoutCompletionResult | null;
  /** Already-formatted session duration, e.g. "48:12". */
  elapsedLabel: string;
  onDismiss: () => void;
};

function XpRow({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null;
  return (
    <View style={styles.xpRow}>
      <Text style={styles.xpLabel}>{label}</Text>
      <Text style={styles.xpValue}>+{value}</Text>
    </View>
  );
}

export function WorkoutCompleteSheet({ visible, result, elapsedLabel, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  // The modal stays mounted across the fade-out, so guard on the payload
  // rather than assuming `visible` implies a finished session.
  if (!result) {
    return <Modal visible={false} transparent onRequestClose={onDismiss} />;
  }

  const { xp, after, levelAfter, leveledUp, newAchievements, progressionStored } = result;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.space.lg) }]}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.kicker}>Workout complete</Text>
            <Text style={styles.headline}>
              {progressionStored ? `+${xp.total} XP` : 'Saved'}
            </Text>
            <Text style={styles.sub}>
              {result.setsCompleted} {result.setsCompleted === 1 ? 'set' : 'sets'} ·{' '}
              {elapsedLabel}
              {result.volume > 0 ? ` · ${formatCount(result.volume)} volume` : ''}
            </Text>

            {/* Everything below is progression, which needs migration 004. The
                workout itself is already saved either way. */}
            {!progressionStored ? null : (
              <>
            <View style={styles.card}>
              <XpRow label="Session" value={xp.workout} />
              <XpRow label={`${result.setsCompleted} sets logged`} value={xp.sets} />
              <XpRow label={`${result.streak}-session streak`} value={xp.streak} />
            </View>

            {leveledUp ? (
              <View style={styles.levelUp}>
                <Text style={styles.levelUpIcon}>🎉</Text>
                <Text style={styles.levelUpText}>Level {levelAfter.level} reached</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <XpBar totalXp={after.totalXp} />
            </View>

            <View style={styles.streakRow}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>
                {result.streak} session{result.streak === 1 ? '' : 's'} in a row
                {after.longestStreak > result.streak
                  ? ` · best ${after.longestStreak}`
                  : ''}
              </Text>
            </View>

            {newAchievements.length ? (
              <>
                <Text style={styles.badgeHeading}>
                  {newAchievements.length === 1 ? 'New badge' : 'New badges'}
                </Text>
                <View style={styles.badgeRow}>
                  {newAchievements.map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      stats={after}
                      highlight
                    />
                  ))}
                </View>
              </>
            ) : null}
              </>
            )}
          </ScrollView>

          <PrimaryButton title="Done" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.backgroundElevated,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    maxHeight: '88%',
  },
  content: { paddingBottom: theme.space.md, gap: theme.space.sm },
  kicker: {
    ...theme.font.label,
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headline: { ...theme.font.display, fontSize: 40, color: theme.colors.tint },
  sub: { ...theme.font.caption, color: theme.colors.textSecondary, marginBottom: theme.space.sm },
  card: {
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.space.md,
    gap: theme.space.xs,
  },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLabel: { ...theme.font.caption, color: theme.colors.textSecondary },
  xpValue: { ...theme.font.mono, color: theme.colors.text },
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.tintDim,
    backgroundColor: theme.colors.tintSoft,
    padding: theme.space.md,
  },
  levelUpIcon: { fontSize: 20 },
  levelUpText: { ...theme.font.bodyMedium, color: theme.colors.tint },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  streakIcon: { fontSize: 16 },
  streakText: { ...theme.font.caption, color: theme.colors.textSecondary },
  badgeHeading: {
    ...theme.font.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: theme.space.sm,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
});
