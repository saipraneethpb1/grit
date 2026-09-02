import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export type KeyboardState = {
  /**
   * Extra bottom padding the content needs to clear the keyboard.
   *
   * Always 0 on Android: `softwareKeyboardLayoutMode: "resize"` (app.json)
   * already shrinks the window, so padding by the keyboard height as well
   * leaves a screen-tall gap under the content.
   */
  padding: number;
  /** True whenever the software keyboard is on screen, on any platform. */
  visible: boolean;
};

/** Tracks the software keyboard (works in Expo Go on Android). */
export function useKeyboardInset(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({ padding: 0, visible: false });

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setState({ padding: isIOS ? e.endCoordinates.height : 0, visible: true });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setState({ padding: 0, visible: false });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return state;
}
