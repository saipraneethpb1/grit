import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useWorkoutOutbox } from '@/src/hooks/useWorkoutOutbox';
import { countLabel } from '@/src/domain/progression';

/**
 * Workouts saved on the phone that have not reached the server yet. Shown only
 * while something is queued; a non-connectivity failure offers Discard so a
 * workout for a deleted plan cannot sit in the queue forever.
 */
export function SyncBanner({ onRetry }: { onRetry: () => void }) {
  const { queued, discard } = useWorkoutOutbox();
  if (!queued.length) return null;
  const failed = queued.find((q) => q.lastError);
  return (
    <View style={[styles.card, failed && styles.cardWarn]} accessibilityLiveRegion="polite">
      <Ionicons name={failed ? 'alert-circle-outline' : 'cloud-upload-outline'} size={18} color={failed ? '#ffb35c' : theme.colors.accentText} />
      <View style={styles.text}>
        <Text style={styles.title}>{countLabel(queued.length, 'workout')} saved on this phone</Text>
        <Text style={styles.detail} numberOfLines={3}>
          {failed ? `Could not sync ${failed.dayName}: ${failed.lastError}` : 'Syncs automatically when you are back online.'}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}><Text style={styles.action}>Sync now</Text></Pressable>
          {failed ? (
            <Pressable onPress={() => void discard(failed.id)} accessibilityRole="button" hitSlop={8}><Text style={[styles.action, styles.discard]}>Discard</Text></Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...theme.card, flexDirection: 'row', gap: 12, padding: 14, marginBottom: 18, backgroundColor: theme.colors.surfaceTint, borderColor: theme.colors.borderTint },
  cardWarn: { borderColor: '#5a4220' },
  text: { flex: 1 },
  title: { ...theme.font.bodyMedium, color: theme.colors.text },
  detail: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  action: { ...theme.font.caption, fontFamily: theme.fontFamily.semibold, color: theme.colors.accentText },
  discard: { color: theme.colors.danger },
});
