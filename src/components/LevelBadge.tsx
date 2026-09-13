import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';
import {
  EXPERIENCE_LEVEL_LABELS,
  type ExperienceLevel,
} from '@/src/domain/methodologies';

type Props = {
  level: ExperienceLevel;
  style?: ViewStyle;
};

const TONE: Record<ExperienceLevel, { fg: string; bg: string; border: string }> = {
  beginner: {
    fg: theme.colors.accentText,
    bg: theme.colors.accentSoft,
    border: theme.colors.accentDim,
  },
  intermediate: {
    fg: theme.colors.textSecondary,
    bg: theme.colors.track,
    border: theme.colors.borderStrong,
  },
  advanced: {
    fg: theme.colors.text,
    bg: theme.colors.borderStrong,
    border: theme.colors.textFaint,
  },
};

/** Difficulty marker so the commitment of a training system is legible up front. */
export function LevelBadge({ level, style }: Props) {
  const tone = TONE[level];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      <Text style={[styles.text, { color: tone.fg }]}>{EXPERIENCE_LEVEL_LABELS[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    alignSelf: 'flex-start',
  },
  text: { ...theme.font.monoSmall, fontWeight: '500', letterSpacing: 0.5 },
});
