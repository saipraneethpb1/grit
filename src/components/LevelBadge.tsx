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
    fg: theme.colors.success,
    bg: theme.colors.successSoft,
    border: theme.colors.successBorder,
  },
  intermediate: {
    fg: theme.colors.textSecondary,
    bg: theme.colors.chip,
    border: theme.colors.border,
  },
  advanced: {
    fg: theme.colors.orange,
    bg: 'rgba(251, 146, 60, 0.12)',
    border: 'rgba(251, 146, 60, 0.35)',
  },
};

/** Difficulty marker so the commitment of a training system is legible up front. */
export function LevelBadge({ level, style }: Props) {
  const tone = TONE[level];

  return (
    <View
      style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }, style]}
    >
      <Text style={[styles.text, { color: tone.fg }]}>
        {EXPERIENCE_LEVEL_LABELS[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.font.label,
    fontSize: 11,
  },
});
