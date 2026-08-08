import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  children: string;
  style?: ViewStyle;
};

export function SectionLabel({ children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.sm },
  text: {
    ...theme.font.label,
    color: theme.colors.textMuted,
  },
});
