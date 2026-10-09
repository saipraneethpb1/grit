import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  children: string;
  /** Accent tone for a kicker that names the block's subject rather than its type. */
  accent?: boolean;
  style?: ViewStyle;
};

/** Uppercase monospace kicker above a block. */
export function SectionLabel({ children, accent, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.text, accent && styles.accent]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  text: { ...theme.font.heading, fontSize: 16, color: theme.colors.textSecondary },
  accent: { color: theme.colors.accentDeep },
});
