import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

const SIZES = { sm: 14, md: 18 } as const;

/** Accent check for completed workout states. */
export function CompletionBadge({ size = 'sm', style }: Props) {
  return (
    <View style={[styles.badge, style]}>
      <Ionicons name="checkmark-circle" size={SIZES[size]} color={theme.colors.accentDeep} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
