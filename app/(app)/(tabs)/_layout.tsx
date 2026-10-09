import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { theme } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** A quiet filled capsule makes the active destination easy to recognize. */
function tabIcon(filled: IconName, outline: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <View style={{ width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.colors.accentSoft : 'transparent' }}>
      <Ionicons size={21} name={focused ? filled : outline} color={color} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: theme.hairline,
          paddingTop: 8,
        },
        tabBarItemStyle: { paddingVertical: 3 },
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
