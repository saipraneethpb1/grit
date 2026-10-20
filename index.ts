import 'expo-router/entry';
import { Platform } from 'react-native';

// Android home-screen widgets draw through a headless task registered at startup.
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Expo Go ships without the widget module; the app runs without widgets there.
  }
}
