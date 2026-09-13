import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * primary: outlined accent — the system's default action.
   * filled: accent-soft fill for the one action that closes a flow.
   * ghost: outlined neutral. danger: outlined red. link: bare text.
   */
  variant?: 'primary' | 'filled' | 'ghost' | 'danger' | 'link';
  icon?: ReactNode;
  style?: ViewStyle;
};

const VARIANTS = {
  primary: { fg: theme.colors.accentText, border: theme.colors.accent, bg: 'transparent', pressed: theme.colors.accentSoft },
  filled: { fg: theme.colors.accentTextStrong, border: theme.colors.accent, bg: theme.colors.accentSoft, pressed: theme.colors.borderTint },
  ghost: { fg: theme.colors.textMuted, border: theme.colors.border, bg: 'transparent', pressed: theme.colors.surface },
  danger: { fg: theme.colors.danger, border: theme.colors.danger, bg: 'transparent', pressed: theme.colors.dangerSoft },
  link: { fg: theme.colors.textDim, border: 'transparent', bg: 'transparent', pressed: 'transparent' },
} as const;

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  style,
}: Props) {
  const tone = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variant === 'link' && styles.link,
        {
          backgroundColor: pressed ? tone.pressed : tone.bg,
          borderColor: tone.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, variant === 'link' && styles.linkText, { color: tone.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    flexDirection: 'row',
    gap: theme.space.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: theme.hairline,
  },
  text: { ...theme.font.cta },
  link: { minHeight: 44, paddingVertical: 8 },
  linkText: { ...theme.font.caption },
});
