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
    gap: theme.space.md,
    borderWidth: theme.hairline,
    borderColor: theme.colors.successBorder,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    marginBottom: theme.space.lg,
  },
  copy: { flex: 1 },
  title: {
    ...theme.font.bodyMedium,
    color: theme.colors.success,
    marginBottom: 2,
  },
  meta: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
  },
});
