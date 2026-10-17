import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/** Hold until the accessibility preference is known; stop while backgrounded. */
export function useMotionAllowed(): boolean {
  const [reduce, setReduce] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let live = true;
    let preferenceChanged = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (live && !preferenceChanged) setReduce(value);
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      preferenceChanged = true;
      setReduce(value);
    });
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { live = false; motion.remove(); app.remove(); };
  }, []);
  return active && !reduce;
}
