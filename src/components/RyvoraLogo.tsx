import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '@/constants/theme';

type Props = {
  /** Mark height in px. */
  size?: number;
  showWordmark?: boolean;
  /** Mark colour; violet by default, sand for the monochrome lockup. */
  color?: string;
  style?: ViewStyle;
};

/** The Ryvora R: a bowl and leg with a parallel stride beneath, drawn on an 810 × 675 grid. */
export const RYVORA_MARK_PATHS = [
  'M35 28H585C680 28 755 105 755 205C755 290 705 360 640 398L548 292H560C595 292 620 262 620 225C620 188 595 158 560 158H175Z',
  'M105 245H370C405 245 425 258 445 280L780 645H600L355 388C345 378 335 376 320 376H210Z',
  'M140 420H310C320 420 328 424 335 432L505 645H335Z',
];

export function RyvoraMark({ size = 28, color = theme.colors.accent }: { size?: number; color?: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={(size * 810) / 675} height={size} viewBox="0 0 810 675">
        {RYVORA_MARK_PATHS.map((d) => <Path key={d} d={d} fill={color} />)}
      </Svg>
    </View>
  );
}

/** Primary lockup: mark beside the wordmark, as on the brand sheet's clear-space panel. */
export function RyvoraLogo({ size = 28, showWordmark = false, color, style }: Props) {
  return (
    <View style={[styles.wrap, { gap: size * 0.42 }, style]} accessible accessibilityRole="image" accessibilityLabel="Ryvora">
      <RyvoraMark size={size} color={color} />
      {showWordmark ? (
        <Text style={[styles.wordmark, { fontSize: size * 1.02, lineHeight: size * 1.2 }]}>Ryvora</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontFamily: theme.fontFamily.display.semibold, fontWeight: '600', letterSpacing: -0.6, color: theme.colors.text },
});
