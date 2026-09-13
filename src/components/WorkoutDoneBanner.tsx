import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { CompletionBadge } from './CompletionBadge';

type Props = {
  dayName: string;
  setsLogged: number;
};

export function WorkoutDoneBanner({ dayName, setsLogged }: Props) {
  return (
    <View style={styles.banner}>
      <CompletionBadge size="md" />
      <View style={styles.copy}>
        <Text style={styles.title}>Workout complete</Text>
        <Text style={styles.meta}>
          {dayName} · {setsLogged} {setsLogged === 1 ? 'set' : 'sets'} logged
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: theme.hairline,
    borderColor: theme.colors.accentDim,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: theme.space.md,
  },
  copy: { flex: 1 },
  title: { ...theme.font.bodyMedium, color: theme.colors.accentText },
  meta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
});
