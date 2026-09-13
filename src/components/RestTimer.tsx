import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

const PRESETS = [60, 90, 120, 180];

type Props = {
  visible: boolean;
  seconds: number;
  /** What the lifter is resting for, e.g. "Bench Press · set 3". */
  nextLabel?: string;
  onClose: () => void;
  onChangeDuration: (sec: number) => void;
};

export function RestTimer({ visible, seconds, nextLabel, onClose, onChangeDuration }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const endAt = useRef<number>(Date.now() + seconds * 1000);

  useEffect(() => {
    if (!visible) return;
    endAt.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
  }, [visible, seconds]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [visible, seconds]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');
  const done = remaining <= 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>{done ? 'Ready' : 'Rest'}</Text>
          <Text style={[styles.time, done && styles.timeDone]}>
            {mm}:{ss}
          </Text>
          {nextLabel ? <Text style={styles.next}>Next · {nextLabel}</Text> : null}

          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const on = seconds === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onChangeDuration(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={styles.preset}
                >
                  {on ? <View style={styles.presetOn} /> : null}
                  <Text style={[styles.presetText, on && styles.presetTextOn]}>{p}s</Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton title={done ? 'Next set' : 'Skip rest'} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: theme.radius.lg,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...theme.shadow.lg,
  },
  kicker: { ...theme.font.kicker, letterSpacing: 1.5, color: theme.colors.accentDeep },
  time: { ...theme.font.clock, color: theme.colors.text, marginTop: 14, marginBottom: 4 },
  timeDone: { color: theme.colors.accentText },
  next: { ...theme.font.caption, color: theme.colors.textDim, marginBottom: 20 },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  preset: {
    minWidth: 56,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  presetOn: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: theme.hairline,
    borderColor: theme.colors.accent,
  },
  presetText: { ...theme.font.mono, color: theme.colors.textMuted },
  presetTextOn: { color: theme.colors.accentText },
});
