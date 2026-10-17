import { LinearGradient } from 'expo-linear-gradient';
import type { StyleProp, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

/**
 * The filled part of a progress bar, painted with the accent gradient running
 * left to right. Size it exactly as you would the plain View it replaces.
 */
export function GradientBar({ style }: { style?: StyleProp<ViewStyle> }) {
  return <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={style} />;
}
