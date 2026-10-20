import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderAndroidWidget } from './android';
import { readWidgetSnapshot } from './storage';

/** Android asks for a widget when it is added, resized or due for its periodic refresh. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED' || props.widgetAction === 'WIDGET_CLICK') return;
  const snapshot = await readWidgetSnapshot();
  props.renderWidget(renderAndroidWidget(props.widgetInfo.widgetName, snapshot, props.widgetInfo.width));
}
