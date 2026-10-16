import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';

/**
 * Checked once: both depend on the OS build and the binary, not on state.
 * `isGlassEffectAPIAvailable` guards iOS 26 betas where the API is missing and
 * rendering a GlassView crashes.
 */
const GLASS_SUPPORTED =
  Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

/** Liquid Glass availability ignores Reduce Transparency; honour it here. */
function useGlass(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!GLASS_SUPPORTED) return;
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((on) => live && setReduced(on));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return GLASS_SUPPORTED && !reduced;
}

/**
 * A floating card that is Liquid Glass on iOS 26+ and the existing solid
 * surface everywhere else (Android, web, older iOS, Reduce Transparency).
 *
 * Pass the solid look in `style` as usual; on glass the background colour and
 * drop shadow are stripped so the material shows through, and shape, padding
 * and layout are kept.
 */
export function GlassSurface({ style, children, ...rest }: ViewProps) {
  const glass = useGlass();
  if (!glass) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  const { backgroundColor: _bg, shadowColor: _sc, shadowOpacity: _so, shadowRadius: _sr,
    shadowOffset: _sf, elevation: _el, ...shape } = StyleSheet.flatten(style) ?? {};
  return (
    <GlassView style={shape} glassEffectStyle="regular" colorScheme="dark" {...rest}>
      {children}
    </GlassView>
  );
}
