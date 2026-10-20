/**
 * Android home-screen widgets (react-native-android-widget). These render from
 * the stored `WidgetSnapshot` in a headless task, so they never reach the
 * network or the app's state: `sync.android.tsx` saves the snapshot and asks
 * the launcher to redraw, and `widget-task-handler.tsx` reads it back when
 * Android needs a widget drawn on its own.
 */
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { HexColor } from 'react-native-android-widget/lib/typescript/widgets/utils/style.props';
import { WIDGET_LINKS, type WidgetSnapshot } from '@/src/domain/widgetSnapshot';

const C = {
  violet: '#8b7cff', sand: '#e9eaf0', muted: '#a0a3b5', dim: '#6e7186', ink: '#0e0f16', future: '#1c1f2c',
} as const;
const HEAT: HexColor[] = ['#262a3b', '#3d3478', '#5a4dc4', '#8072f5', '#b9b0ff'];
const BACKGROUND = { from: '#17162b', to: '#0e0f16', orientation: 'TR_BL' } as const;
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Kicker({ label }: { label: string }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
      <FlexWidget style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.violet, marginRight: 6 }} />
      <TextWidget text={label} style={{ fontSize: 10, color: C.muted, letterSpacing: 0.12, fontWeight: '600' }} />
    </FlexWidget>
  );
}

function Week({ s, cell }: { s: WidgetSnapshot; cell: number }) {
  return (
    <FlexWidget style={{ flexDirection: 'row' }}>
      {s.week.map((level, i) => (
        <FlexWidget key={i} style={{ alignItems: 'center', marginRight: i < 6 ? 4 : 0 }}>
          <FlexWidget style={{ width: cell, height: cell, borderRadius: 3, backgroundColor: level < 0 ? C.future : HEAT[level] }} />
          <TextWidget text={DAYS[i]} style={{ fontSize: 8, marginTop: 3, color: i === s.todayIndex ? C.sand : C.dim, fontWeight: i === s.todayIndex ? '700' : '400' }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

const frame = { height: 'match_parent', width: 'match_parent', padding: 14, borderRadius: 22, backgroundGradient: BACKGROUND } as const;

/** Today's session: name, summary, this week's heat row and a start action. Wide sizes add the exercise preview. */
export function TodayWidget({ s, wide }: { s: WidgetSnapshot; wide: boolean }) {
  const today = s.today;
  if (!s.signedIn || !today) {
    return (
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: WIDGET_LINKS.home }} style={{ ...frame, justifyContent: 'space-between' }}>
        <Kicker label="RYVORA" />
        <FlexWidget>
          <TextWidget text={s.signedIn ? 'No program yet' : 'Sign in to train'} style={{ fontSize: 17, color: C.sand, fontWeight: '600' }} />
          <TextWidget text={s.signedIn ? 'Open Ryvora to build your week.' : 'Your session shows up here.'} style={{ fontSize: 12, color: C.muted, marginTop: 2 }} />
        </FlexWidget>
      </FlexWidget>
    );
  }
  const uri = today.done ? WIDGET_LINKS.home : WIDGET_LINKS.workout(today);
  const action = today.done ? (
    <TextWidget text="✓ Done today" style={{ fontSize: 12, color: C.violet, fontWeight: '600' }} />
  ) : (
    <FlexWidget style={{ backgroundColor: C.violet, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 5 }}>
      <TextWidget text="▶  Start" style={{ fontSize: 12, color: C.ink, fontWeight: '600' }} />
    </FlexWidget>
  );

  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri }} style={{ ...frame, flexDirection: 'row' }}>
      <FlexWidget style={{ flex: 1, height: 'match_parent', justifyContent: 'space-between' }}>
        <Kicker label={`TODAY · ${today.position.toUpperCase()}`} />
        <FlexWidget>
          <TextWidget text={today.name} maxLines={1} truncate="END" style={{ fontSize: wide ? 22 : 19, color: C.sand, fontWeight: '600' }} />
          <TextWidget text={wide ? today.summary : today.programName} maxLines={1} truncate="END" style={{ fontSize: 11, color: C.muted, marginTop: 2 }} />
          {wide
            ? today.preview.map((name, i) => (
                <TextWidget key={i} text={name} maxLines={1} truncate="END" style={{ fontSize: 11, color: i === 0 ? C.sand : C.muted, marginTop: i === 0 ? 8 : 2 }} />
              ))
            : null}
        </FlexWidget>
        {wide ? null : action}
      </FlexWidget>
      {wide ? (
        <FlexWidget style={{ height: 'match_parent', alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 12 }}>
          <FlexWidget style={{ alignItems: 'flex-end' }}>
            <TextWidget text={`${s.streak}`} style={{ fontSize: 26, color: C.sand, fontWeight: '600' }} />
            <TextWidget text="STREAK" style={{ fontSize: 9, color: C.dim, fontWeight: '600' }} />
          </FlexWidget>
          <Week s={s} cell={13} />
          {action}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/** Streak count, this week's progress and the seven-day heat row. */
export function StreakWidget({ s }: { s: WidgetSnapshot }) {
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: WIDGET_LINKS.progress }} style={{ ...frame, justifyContent: 'space-between' }}>
      <Kicker label="STREAK" />
      <FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <TextWidget text={`${s.streak}`} style={{ fontSize: 38, color: C.sand, fontWeight: '600' }} />
          <TextWidget text={s.streak === 1 ? ' session' : ' sessions'} style={{ fontSize: 12, color: C.muted, marginBottom: 6 }} />
        </FlexWidget>
        <TextWidget text={`${s.weekDone} of ${s.weekTarget || '–'} this week`} style={{ fontSize: 11, color: C.muted }} />
      </FlexWidget>
      <Week s={s} cell={12} />
    </FlexWidget>
  );
}

/** Renders the named widget for a size; wide layouts start at roughly four cells across. */
export function renderAndroidWidget(name: string, s: WidgetSnapshot, widthDp: number) {
  if (name === 'RyvoraStreak') return <StreakWidget s={s} />;
  return <TodayWidget s={s} wide={widthDp >= 250} />;
}
