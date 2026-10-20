import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * primary: accent gradient for the main action.
   * filled: accent gradient for the action that closes a flow.
   * ghost: outlined neutral. danger: outlined red. link: bare text.
   */
  variant?: 'primary' | 'filled' | 'ghost' | 'danger' | 'link';
  icon?: ReactNode;
  style?: ViewStyle;
};

const VARIANTS = {
  primary: { fg: theme.colors.onAccent, border: 'transparent', bg: theme.colors.accent, pressed: theme.colors.accentBright },
  filled: { fg: theme.colors.onAccent, border: 'transparent', bg: theme.colors.accent, pressed: theme.colors.accentBright },
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
  const filled = variant === 'primary' || variant === 'filled';
  // A disabled fill turns neutral rather than fading the violet, which reads as muddy.
  const inactive = Boolean(disabled) && !loading;
  const gradient = filled && !inactive;

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
        gradient && styles.glow,
        {
          // The gradient paints the fill itself.
          backgroundColor: gradient ? 'transparent' : filled ? theme.colors.surfaceRaised : pressed ? tone.pressed : tone.bg,
          borderColor: filled && inactive ? theme.colors.border : tone.border,
          opacity: inactive && !filled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {gradient ? (
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.fill, { opacity: pressed ? 0.86 : 1 }]}
            />
          ) : null}
          {loading ? (
            <ActivityIndicator color={tone.fg} />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, variant === 'link' && styles.linkText, { color: filled && inactive ? theme.colors.textFaint : tone.fg }]}>{title}</Text>
            </>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 54,
    flexDirection: 'row',
    gap: theme.space.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: theme.hairline,
  },
  /**
   * Rounded here rather than clipping the button with `overflow: 'hidden'`,
   * which on iOS would also clip the glow.
   */
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: theme.radius.md },
  /** iOS and web; Android ignores coloured shadows. */
  glow: theme.shadow.button,
  text: { ...theme.font.cta },
  link: { minHeight: 44, paddingVertical: 8 },
  linkText: { ...theme.font.caption },
});
