import { Feather } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

const SIZES = {
  sm: { box: 16, icon: 9 },
  md: { box: 20, icon: 11 },
} as const;

/** Green check badge for completed workout states. */
export function CompletionBadge({ size = 'sm', style }: Props) {
  const dim = SIZES[size].box;
  const icon = SIZES[size].icon;

  return (
    <View style={[styles.badge, { width: dim, height: dim, borderRadius: dim / 2 }, style]}>
      <Feather name="check" size={icon} color={theme.colors.successOn} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
