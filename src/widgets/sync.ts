import type { WidgetSnapshot } from '@/src/domain/widgetSnapshot';

/** Web has no home-screen widgets; `sync.ios.ts` and `sync.android.tsx` do the real work. */
export async function syncWidgets(_snapshot: WidgetSnapshot): Promise<void> {}
