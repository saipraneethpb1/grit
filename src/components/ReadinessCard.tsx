import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { Readiness } from '@/src/domain/coach';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const LOOK: Record<Readiness['status'], { icon: IconName; color: string }> = {
  ready: { icon: 'trending-up', color: '#7ee0a3' },
  deload: { icon: 'battery-half', color: '#ffb35c' },
  'ease-in': { icon: 'leaf-outline', color: '#7cc7ff' },
  spike: { icon: 'warning-outline', color: '#ffb35c' },
  new: { icon: 'flag-outline', color: theme.colors.accentText },
};

/** The coach's read on this week, from the shape of recent training. */
export function ReadinessCard({ readiness }: { readiness: Readiness }) {
  const look = LOOK[readiness.status];
  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`Coach: ${readiness.title}. ${readiness.detail}`}>
      <View style={[styles.icon, { borderColor: look.color }]}>
        <Ionicons name={look.icon} size={16} color={look.color} />
      </View>
      <View style={styles.text}>
        <Text style={styles.kicker}>COACH</Text>
        <Text style={styles.title}>{readiness.title}</Text>
        <Text style={styles.detail}>{readiness.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...theme.card, flexDirection: 'row', gap: 14, padding: 16, marginBottom: 22 },
  icon: { width: 36, height: 36, borderRadius: 18, borderWidth: theme.hairline, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  kicker: { ...theme.font.kicker, fontSize: 9.5, color: theme.colors.textFaint },
  title: { ...theme.font.heading, color: theme.colors.text, marginTop: 4 },
  detail: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: 3 },
});
