repo: saipraneethpb1/grit
branch: main

## Last sync

date: 2026-09-12T10:22:00Z

### Updated in this project

- Read the Expo app's theme, screens and components as the basis for a new mobile design pass.
- Built `Grit App.dc.html`: interactive prototype of onboarding, home, day detail, live logging, rest timer, program, library and profile.
- Restyled the app on the Nocturne design system (blurple accent, dark blue-grey ground) instead of the repo's near-black + lime palette.
- Added two alternate treatments: a recovery-led home and a one-thumb dial logger.

## Screen map

| Project screen | Repo files |
| --- | --- |
| Home / Train | app/(app)/(tabs)/index.tsx, src/components/WeekStrip.tsx, src/components/StatPill.tsx, src/components/XpBar.tsx |
| Day detail | app/(app)/plan/day/[dayId].tsx, src/components/DayWorkoutList.tsx |
| Active logging | app/(app)/workout/[dayId].tsx, src/domain/liveWorkout.ts, src/domain/types.ts |
| Rest timer | src/components/RestTimer.tsx |
| Library | app/(app)/(tabs)/exercises.tsx, src/components/ExerciseRow.tsx, src/components/MuscleChip.tsx |
| Profile / progress | app/(app)/(tabs)/profile.tsx, src/components/AchievementGrid.tsx, src/domain/progression.ts |
| Program | src/domain/catalog.ts, src/domain/methodologies.ts, app/(app)/splits/index.tsx |
| Tab bar | app/(app)/(tabs)/_layout.tsx |
| Tokens | constants/theme.ts, constants/Colors.ts |
