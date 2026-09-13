import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { theme } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Filled glyph when focused, outline otherwise — the accent as a line, not a flood. */
function tabIcon(filled: IconName, outline: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons size={19} name={focused ? filled : outline} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.divider,
          borderTopWidth: theme.hairline,
          paddingTop: 6,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { ...theme.font.tab },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Train', tabBarIcon: tabIcon('flash', 'flash-outline') }}
      />
      <Tabs.Screen
        name="program"
        options={{ title: 'Program', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Library', tabBarIcon: tabIcon('barbell', 'barbell-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'You', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
