/**
 * iOS home-screen and Lock Screen widgets (expo-widgets, rendered with SwiftUI).
 *
 * Each layout below is compiled to a string by the `'widget'` directive and runs
 * in the widget extension's own JS runtime, where the `@expo/ui/swift-ui`
 * components and modifiers are globals. So inside a layout: use those exact
 * names (no aliasing), inline every colour, and define helpers in the function
 * body — nothing from this module's scope exists there. Data arrives as the
 * `WidgetSnapshot` props written by `src/widgets/sync.ios.ts`.
 */
import {
  Capsule,
  HStack,
  Image,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetSnapshot } from '@/src/domain/widgetSnapshot';

// The imports above are referenced by name inside the compiled layouts.
void [Capsule, HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack, containerBackground, font, foregroundStyle, frame, lineLimit, padding, widgetURL];

const TodayLayout = (s: WidgetSnapshot, env: WidgetEnvironment) => {
  'widget';
  const violet = '#8b7cff';
  const sand = '#e9eaf0';
  const muted = '#a0a3b5';
  const dim = '#6e7186';
  const heat = ['#262a3b', '#3d3478', '#5a4dc4', '#8072f5', '#b9b0ff'];
  const background = containerBackground({ type: 'linearGradient', colors: ['#17162b', '#0e0f16'], startPoint: { x: 1, y: 0 }, endPoint: { x: 0, y: 1 } }, 'widget');
  const today = s.today;
  const link = today && !today.done ? `grit:///workout/${today.dayId}?planId=${today.planId}` : 'grit:///';

  if (env.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(link)]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>{today ? (today.done ? 'Done today' : 'Today') : 'Ryvora'}</Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), lineLimit(1)]}>{today ? today.name : s.signedIn ? 'Pick a program' : 'Sign in'}</Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>{s.streak > 0 ? `${s.streak}-session streak` : today ? today.position : ''}</Text>
      </VStack>
    );
  }

  const kicker = (label: string) => (
    <HStack spacing={6}>
      <Image systemName="bolt.fill" size={10} color={violet} />
      <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(muted)]}>{label}</Text>
    </HStack>
  );

  if (!s.signedIn || !today) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[background, widgetURL('grit:///')]}>
        {kicker('RYVORA')}
        <Spacer />
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(sand)]}>{s.signedIn ? 'No program yet' : 'Sign in to train'}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), lineLimit(2)]}>{s.signedIn ? 'Open Ryvora to build your week.' : 'Your session shows up here.'}</Text>
      </VStack>
    );
  }

  const week = (
    <HStack spacing={4}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <VStack key={i} spacing={3}>
          <RoundedRectangle cornerRadius={3} modifiers={[
            frame({ width: 13, height: 13 }),
            foregroundStyle(s.week[i] < 0 ? '#1c1f2c' : heat[s.week[i]]),
          ]} />
          <Text modifiers={[font({ size: 8, weight: i === s.todayIndex ? 'bold' : 'regular' }), foregroundStyle(i === s.todayIndex ? sand : dim)]}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
          </Text>
        </VStack>
      ))}
    </HStack>
  );

  const status = today.done ? (
    <HStack spacing={4}>
      <Image systemName="checkmark.circle.fill" size={12} color={violet} />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(violet)]}>Done today</Text>
    </HStack>
  ) : (
    <ZStack>
      <Capsule modifiers={[foregroundStyle(violet), frame({ height: 26 })]} />
      <HStack spacing={4} modifiers={[padding({ horizontal: 12 })]}>
        <Image systemName="play.fill" size={10} color="#0e0f16" />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#0e0f16')]}>Start</Text>
      </HStack>
    </ZStack>
  );

  if (env.widgetFamily === 'systemMedium') {
    return (
      <HStack alignment="top" spacing={14} modifiers={[background, widgetURL(link)]}>
        <VStack alignment="leading" spacing={4}>
          {kicker(`TODAY · ${today.position.toUpperCase()}`)}
          <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(sand), lineLimit(1)]}>{today.name}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{today.summary}</Text>
          <Spacer />
          {today.preview.map((name, i) => (
            <Text key={i} modifiers={[font({ size: 11 }), foregroundStyle(i === 0 ? sand : muted), lineLimit(1)]}>{name}</Text>
          ))}
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={6}>
          <Text modifiers={[font({ size: 26, weight: 'semibold' }), foregroundStyle(sand)]}>{`${s.streak}`}</Text>
          <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(dim)]}>STREAK</Text>
          <Spacer />
          {week}
          {status}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[background, widgetURL(link)]}>
      {kicker('TODAY')}
      <Spacer />
      <Text modifiers={[font({ size: 19, weight: 'semibold' }), foregroundStyle(sand), lineLimit(2)]}>{today.name}</Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{today.position}</Text>
      <Spacer />
      {status}
    </VStack>
  );
};

const StreakLayout = (s: WidgetSnapshot, env: WidgetEnvironment) => {
  'widget';
  const violet = '#8b7cff';
  const sand = '#e9eaf0';
  const muted = '#a0a3b5';
  const heat = ['#262a3b', '#3d3478', '#5a4dc4', '#8072f5', '#b9b0ff'];
  const background = containerBackground({ type: 'linearGradient', colors: ['#17162b', '#0e0f16'], startPoint: { x: 1, y: 0 }, endPoint: { x: 0, y: 1 } }, 'widget');

  if (env.widgetFamily === 'accessoryInline') {
    return <Text modifiers={[widgetURL('grit:///progress')]}>{`${s.streak} streak · ${s.weekDone}/${s.weekTarget || '–'} this week`}</Text>;
  }
  if (env.widgetFamily === 'accessoryCircular') {
    return (
      <VStack spacing={0} modifiers={[widgetURL('grit:///progress')]}>
        <Image systemName="flame.fill" size={12} />
        <Text modifiers={[font({ size: 20, weight: 'bold' })]}>{`${s.streak}`}</Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[background, widgetURL('grit:///progress')]}>
      <HStack spacing={6}>
        <Image systemName="flame.fill" size={11} color={violet} />
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(muted)]}>STREAK</Text>
      </HStack>
      <Spacer />
      <HStack alignment="firstTextBaseline" spacing={4}>
        <Text modifiers={[font({ size: 40, weight: 'semibold' }), foregroundStyle(sand)]}>{`${s.streak}`}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{s.streak === 1 ? 'session' : 'sessions'}</Text>
      </HStack>
      <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{`${s.weekDone} of ${s.weekTarget || '–'} this week`}</Text>
      <Spacer />
      <HStack spacing={3}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <RoundedRectangle key={i} cornerRadius={3} modifiers={[
            frame({ width: 14, height: 14 }),
            foregroundStyle(s.week[i] < 0 ? '#1c1f2c' : heat[s.week[i]]),
          ]} />
        ))}
      </HStack>
    </VStack>
  );
};

export const TodayWidget = createWidget<WidgetSnapshot>('RyvoraToday', TodayLayout);
export const StreakWidget = createWidget<WidgetSnapshot>('RyvoraStreak', StreakLayout);
