import type { WidgetSnapshot } from '@/src/domain/widgetSnapshot';
import { writeWidgetSnapshot } from './storage';

const NAMES = ['RyvoraToday', 'RyvoraStreak'];

type Native = { requestWidgetUpdate: typeof import('react-native-android-widget').requestWidgetUpdate; render: typeof import('./android').renderAndroidWidget };
let native: Native | null | undefined;

/** Loaded lazily: Expo Go lacks the widget native module and would throw at import. */
function load(): Native | null {
  if (native !== undefined) return native;
  try {
    native = { requestWidgetUpdate: require('react-native-android-widget').requestWidgetUpdate, render: require('./android').renderAndroidWidget };
  } catch {
    native = null;
  }
  return native;
}

/**
 * Stores the snapshot for the headless task handler, then redraws every placed
 * widget now.
 */
export async function syncWidgets(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await writeWidgetSnapshot(snapshot);
    const n = load();
    if (!n) return;
    await Promise.all(NAMES.map((widgetName) =>
      n.requestWidgetUpdate({ widgetName, renderWidget: (info) => n.render(widgetName, snapshot, info.width) })));
  } catch {
    // A widget failure must never break the app.
  }
}
