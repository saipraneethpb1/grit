import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the iOS system tab bar above the home indicator, with room for its floating Liquid Glass form. */
const IOS_TAB_BAR = 64;

/**
 * Bottom padding a tab screen's scroll content needs so its last row clears the
 * tab bar. iOS draws the system tab bar over the content (automatic insets are
 * off in `_layout.ios.tsx`, because they only reach a screen's first ScrollView
 * and the Library's first one is the filter chips). Android and web lay the JS
 * tab bar out below the screen, so nothing is needed there.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? insets.bottom + IOS_TAB_BAR : 0;
}
