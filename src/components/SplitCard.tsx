import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { SplitTemplate } from '@/src/domain/types';

type Props = {
  split: SplitTemplate;
  onPress: () => void;
  selected?: boolean;
  /** Short label explaining why this one stands out, e.g. "Recommended". */
  badge?: string;
};

export function SplitCard({ split, onPress, selected, badge }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <View style={styles.radio}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.body}>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <View style={styles.header}>
          <Text style={styles.title}>{split.name}</Text>
          <Text style={styles.days}>{split.days_per_week} days</Text>
        </View>
        <Text style={styles.desc} numberOfLines={3}>
          {split.description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...theme.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 9,
  },
  selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  pressed: { borderColor: theme.colors.accentDim },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },
  body: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm },
  title: { ...theme.font.bodyMedium, color: theme.colors.text, flex: 1 },
  days: { ...theme.font.monoSmall, color: theme.colors.textDim },
  badge: { ...theme.font.kicker, fontSize: 10, color: theme.colors.accentDeep, marginBottom: 4 },
  desc: { ...theme.font.small, color: theme.colors.textDim, marginTop: 2 },
});
