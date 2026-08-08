import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: theme.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.font.title,
    color: theme.colors.text,
    marginBottom: theme.space.sm,
    textAlign: 'center',
  },
  message: {
    ...theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.space.md,
  },
  action: { width: '100%', maxWidth: 300 },
});
