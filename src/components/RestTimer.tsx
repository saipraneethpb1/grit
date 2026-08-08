import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

const PRESETS = [60, 90, 120, 180];

type Props = {
  visible: boolean;
  seconds: number;
  onClose: () => void;
  onChangeDuration: (sec: number) => void;
};

export function RestTimer({ visible, seconds, onClose, onChangeDuration }: Props) {
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

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const done = remaining <= 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.label}>{done ? 'Done' : 'Rest'}</Text>
          <Text style={[styles.time, done && { color: theme.colors.textSecondary }]}>
            {done ? '00:00' : `${mm}:${ss}`}
          </Text>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p}
                onPress={() => onChangeDuration(p)}
                style={[
                  styles.preset,
                  {
                    backgroundColor: seconds === p ? theme.colors.white : 'transparent',
                    borderColor: seconds === p ? theme.colors.white : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: seconds === p ? theme.colors.black : theme.colors.textSecondary,
                    ...theme.font.caption,
                  }}
                >
                  {p}s
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onClose} style={styles.btn}>
            <Text style={styles.btnText}>{done ? 'Continue' : 'Skip'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  sheet: {
    borderRadius: theme.radius.lg,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.space.lg,
    alignItems: 'center',
  },
  label: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.sm },
  time: {
    fontSize: 48,
    fontWeight: '300',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
    marginBottom: theme.space.lg,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
  },
  btn: {
    width: '100%',
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  btnText: { ...theme.font.bodyMedium, color: theme.colors.black },
});
