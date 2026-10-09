import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
      <View style={styles.icon}><Ionicons name="barbell-outline" size={28} color={theme.colors.accent} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...theme.card, padding: theme.space.lg, width: '100%' },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: 6 },
  message: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: theme.space.lg },
  action: { width: '100%' },
});
