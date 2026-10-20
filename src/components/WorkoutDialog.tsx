import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
import { PrimaryButton } from './PrimaryButton';
import { themed } from '@/constants/themed';

export type WorkoutDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  destructive?: boolean;
  /** Only the confirm button: for outcomes that need acknowledging, not a choice. */
  acknowledgeOnly?: boolean;
};

/** Native Alert is a no-op on web; all workout feedback uses this dialog. */
export function WorkoutDialog({ dialog, onClose }: {
  dialog: WorkoutDialogState | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={dialog?.acknowledgeOnly ? () => { const c = dialog.onConfirm; onClose(); c?.(); } : onClose}>
      <View style={styles.backdrop}>
        <GlassSurface style={styles.card} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>{dialog?.title}</Text>
            <Text style={styles.message}>{dialog?.message}</Text>
            <View style={styles.actions}>
              {dialog?.onConfirm ? (
                <PrimaryButton
                  title={dialog.confirmLabel ?? 'Confirm'}
                  variant={dialog.destructive ? 'danger' : 'primary'}
                  onPress={() => {
                    const confirm = dialog.onConfirm;
                    onClose();
                    confirm?.();
                  }}
                />
              ) : null}
              {dialog?.acknowledgeOnly ? null : (
                <PrimaryButton
                  title={dialog?.onConfirm ? 'Keep training' : 'Got it'}
                  variant="ghost"
                  onPress={onClose}
                />
              )}
            </View>
          </ScrollView>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    alignSelf: 'center',
    padding: 22,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    ...theme.shadow.lg,
  },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: 10 },
  message: { ...theme.font.body, color: theme.colors.textMuted },
  actions: { gap: 9, marginTop: 22 },
}));
