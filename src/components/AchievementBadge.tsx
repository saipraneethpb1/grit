import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/theme';
import {
  formatCount,
  isEarned,
  type Achievement,
  type ProgressStats,
} from '@/src/domain/progression';
import { themed } from '@/constants/themed';

type Props = {
  achievement: Achievement;
  stats: ProgressStats;
  /** Celebration styling for a badge earned seconds ago. */
  highlight?: boolean;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tier = 'bronze' | 'silver' | 'gold' | 'ryvora';

/**
 * Presentation for each badge: an icon from the app's own set and a metal tier
 * that rises with difficulty inside its category. The catalog's emoji remain a
 * plain-text fallback for any badge added without an entry here.
 */
const BADGES: Record<string, { icon: IconName; tier: Tier }> = {
  first_session: { icon: 'play', tier: 'bronze' },
  habit_forming: { icon: 'leaf', tier: 'bronze' },
  double_digits: { icon: 'ribbon', tier: 'silver' },
  regular: { icon: 'barbell', tier: 'silver' },
  half_century: { icon: 'fitness', tier: 'gold' },
  centurion: { icon: 'trophy', tier: 'gold' },
  veteran: { icon: 'medal', tier: 'ryvora' },
  streak_3: { icon: 'flame', tier: 'bronze' },
  streak_7: { icon: 'calendar', tier: 'silver' },
  streak_14: { icon: 'flash', tier: 'silver' },
  streak_30: { icon: 'calendar-number', tier: 'gold' },
  streak_100: { icon: 'diamond', tier: 'ryvora' },
  sets_100: { icon: 'stats-chart', tier: 'bronze' },
  sets_500: { icon: 'layers', tier: 'silver' },
  sets_1000: { icon: 'cube', tier: 'gold' },
  sets_5000: { icon: 'cog', tier: 'ryvora' },
  volume_10k: { icon: 'barbell-outline', tier: 'bronze' },
  volume_100k: { icon: 'trending-up', tier: 'silver' },
  volume_500k: { icon: 'podium', tier: 'gold' },
  level_5: { icon: 'star', tier: 'silver' },
  level_10: { icon: 'sparkles', tier: 'gold' },
  level_20: { icon: 'rocket', tier: 'ryvora' },
};

/** Highlight, body and shadow stops of each metal, plus the engraved icon colour. */
const METALS: Record<Tier, { light: string; mid: string; dark: string; icon: string; label: string }> = {
  bronze: { light: '#f6d2b0', mid: '#c9875a', dark: '#6d3a1d', icon: '#f1c39c', label: 'Bronze' },
  silver: { light: '#ffffff', mid: '#b4bac9', dark: '#555c6d', icon: '#e4e7ef', label: 'Silver' },
  gold: { light: '#fff3c2', mid: '#e2b24c', dark: '#7a5410', icon: '#ffe08a', label: 'Gold' },
  ryvora: { light: '#ece8ff', mid: '#9b8dff', dark: '#33287f', icon: '#cfc8ff', label: 'Ryvora' },
};

const SIZE = 100;
const C = SIZE / 2;
/** Pointy-top hexagon of circumradius `r`, starting at the top vertex and running clockwise. */
function hexagon(r: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  });
}
const points = (r: number) => hexagon(r).map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
const RIM = 43;
const FACE = 34;
const RING = 47;
/** Closed path from the top vertex, so a dash offset of 0 fills clockwise from 12 o'clock. */
const RING_PATH = `M${hexagon(RING).map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L')} Z`;
const RING_LENGTH = 6 * RING;

function Medal({ tier, earned, progress, icon, size }: {
  tier: Tier; earned: boolean; progress: number; icon: IconName | null; size: number;
}) {
  const m = METALS[tier];
  const id = earned ? tier : 'locked';
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id={`rim-${id}`} x1="0.15" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor={earned ? m.light : '#3a3e52'} />
            <Stop offset="0.45" stopColor={earned ? m.mid : '#262a3b'} />
            <Stop offset="1" stopColor={earned ? m.dark : '#181a26'} />
          </LinearGradient>
          <LinearGradient id={`bevel-${id}`} x1="0.85" y1="1" x2="0.15" y2="0">
            <Stop offset="0" stopColor={earned ? m.light : '#2c3043'} stopOpacity={earned ? 0.9 : 1} />
            <Stop offset="1" stopColor={earned ? m.dark : '#141620'} />
          </LinearGradient>
          <RadialGradient id={`face-${id}`} cx="0.38" cy="0.3" r="0.8">
            <Stop offset="0" stopColor={earned ? '#2a2d40' : '#191b27'} />
            <Stop offset="1" stopColor="#0c0d14" />
          </RadialGradient>
        </Defs>
        {/* Rim: rounded by stroking in its own fill. */}
        <Polygon points={points(RIM)} fill={`url(#rim-${id})`} stroke={`url(#rim-${id})`} strokeWidth={8} strokeLinejoin="round" />
        {/* Inner bevel catches light from the opposite side, so the rim reads as raised metal. */}
        <Polygon points={points(FACE + 4)} fill={`url(#bevel-${id})`} stroke={`url(#bevel-${id})`} strokeWidth={4} strokeLinejoin="round" />
        <Polygon points={points(FACE)} fill={`url(#face-${id})`} stroke={`url(#face-${id})`} strokeWidth={3} strokeLinejoin="round" />
        {/* Thin specular line along the upper rim. */}
        {earned ? (
          <Path d={`M${hexagon(RIM + 2)[5].x} ${hexagon(RIM + 2)[5].y} L${hexagon(RIM + 2)[0].x} ${hexagon(RIM + 2)[0].y} L${hexagon(RIM + 2)[1].x} ${hexagon(RIM + 2)[1].y}`}
            stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {!earned && progress > 0 ? (
          <>
            <Path d={RING_PATH} fill="none" stroke={theme.colors.track} strokeWidth={2.4} strokeLinejoin="round" />
            <Path d={RING_PATH} fill="none" stroke={theme.colors.accent} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={`${(RING_LENGTH * Math.min(1, progress)).toFixed(1)} ${RING_LENGTH}`} />
          </>
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.iconWrap]}>
        {icon ? (
          <Ionicons name={icon} size={size * 0.3}
            color={earned ? m.icon : '#4a4f66'} />
        ) : null}
      </View>
    </View>
  );
}

/** Metal medal with the badge's name and either its tier or progress toward it. */
export function AchievementBadge({ achievement, stats, highlight }: Props) {
  const earned = isEarned(achievement, stats);
  const progress = achievement.measure(stats);
  const look = BADGES[achievement.id];
  const tier = look?.tier ?? 'silver';
  const metal = METALS[tier];

  return (
    <View
      style={[styles.card, highlight && styles.highlight]}
      accessibilityRole="image"
      accessibilityLabel={`${achievement.name}, ${metal.label} badge. ${achievement.description}. ${
        earned ? 'Earned' : `${formatCount(Math.min(progress, achievement.threshold))} of ${formatCount(achievement.threshold)}`
      }`}
    >
      {look ? (
        <Medal tier={tier} earned={earned} progress={progress / achievement.threshold} icon={look.icon} size={62} />
      ) : (
        <Text style={[styles.emoji, !earned && styles.emojiLocked]}>{achievement.icon}</Text>
      )}
      <Text style={[styles.name, earned && styles.nameEarned]} numberOfLines={2}>
        {achievement.name}
      </Text>
      <Text style={[styles.meta, earned && { color: metal.icon }]} numberOfLines={1}>
        {earned
          ? metal.label
          : `${formatCount(Math.min(progress, achievement.threshold))} / ${formatCount(achievement.threshold)}`}
      </Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  highlight: { borderWidth: theme.hairline, borderColor: theme.colors.borderTint, backgroundColor: theme.colors.surfaceTint },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26, lineHeight: 62 },
  emojiLocked: { opacity: 0.3 },
  name: { ...theme.font.small, fontFamily: theme.fontFamily.medium, fontSize: 11, lineHeight: 14, color: theme.colors.textMuted, textAlign: 'center', marginTop: 10, minHeight: 28 },
  nameEarned: { color: theme.colors.text },
  meta: { ...theme.font.kicker, fontSize: 8.5, lineHeight: 11, letterSpacing: 1.4, color: theme.colors.textFaint, marginTop: 4 },
}));
