import type { WidgetSnapshot } from '@/src/domain/widgetSnapshot';

type Widgets = typeof import('./ios');
let widgets: Widgets | null | undefined;

/**
 * Loaded lazily: the widget module needs the expo-widgets native code, which
 * Expo Go does not ship. There it fails once and widgets are simply skipped.
 */
function load(): Widgets | null {
  if (widgets !== undefined) return widgets;
  try {
    widgets = require('./ios') as Widgets;
  } catch {
    widgets = null;
  }
  return widgets;
}

/** Hands the snapshot to both iOS widgets; WidgetKit redraws them from it. */
export async function syncWidgets(snapshot: WidgetSnapshot): Promise<void> {
  const w = load();
  if (!w) return;
  try {
    w.TodayWidget.updateSnapshot(snapshot);
    w.StreakWidget.updateSnapshot(snapshot);
  } catch {
    // A widget failure must never break the app.
  }
}
