import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { theme } from '@/constants/theme';

/**
 * iOS uses the system tab bar, which renders as Liquid Glass on iOS 26 and the
 * standard translucent bar on earlier versions. Android and web keep the JS
 * tab bar in `_layout.tsx`.
 *
 * Native tabs render every screen eagerly and cannot add or remove tabs at
 * runtime — keep this list static and in step with `_layout.tsx`.
 */
export default function TabLayout() {
  const content = { backgroundColor: theme.colors.background };
  return (
    <NativeTabs tintColor={theme.colors.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index" contentStyle={content}>
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt', selected: 'bolt.fill' }} />
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="program" contentStyle={content}>
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>Program</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exercises" contentStyle={content}>
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" contentStyle={content}>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" contentStyle={content}>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
