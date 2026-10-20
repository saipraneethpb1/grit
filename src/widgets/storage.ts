import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIGNED_OUT_SNAPSHOT, type WidgetSnapshot } from '@/src/domain/widgetSnapshot';

const KEY = 'ryvora.widgetSnapshot.v1';

/** Last snapshot the app wrote, for Android widgets drawn while the app is closed. */
export async function readWidgetSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    // Fall through to the signed-out view rather than a blank widget.
  }
  return SIGNED_OUT_SNAPSHOT(new Date());
}

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
}
