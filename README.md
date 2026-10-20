# Ryvora

Mobile workout planner: pick a training system and weekly split, get full-gym workouts by muscle group, log sets live, and save your plan to your account.

Built with **Expo (React Native)**, **Expo Router**, **TypeScript**, and **Supabase** (Auth + Postgres + RLS).

## Light and dark mode

The app follows the phone's appearance by default, with a **System / Light / Dark**
choice on the You tab (stored per device). `constants/Colors.ts` holds both
palettes, each checked for WCAG AA contrast; `colors` is the live one and
`applyColorScheme` swaps it in place. Every style sheet and colour table is
wrapped in `themed()` (`constants/themed.ts`), which rebuilds it when the palette
changes, and the root remounts the navigator on a switch. New styles must use
`themed(() => StyleSheet.create({...}))`, and colours must come from palette
tokens rather than hex values. The anatomical body map keeps its dark artwork
panel in both modes, and home-screen widgets stay dark.

## Brand

The interface follows the Ryvora identity: Charcoal `#0E0F16` surfaces, Sand
`#E9EAF0` text and a single Violet `#8B7CFF` accent, used only for actions,
progress and the active state (`constants/Colors.ts`). Sora sets headings and
figures, Inter sets reading text, and labels are widely tracked uppercase with a
short violet rule (`BrandKicker`). The R mark is a vector component
(`RyvoraLogo`), and the app icon, adaptive icon, splash and favicon are rendered
from the same paths. The store package ID, EAS project, slug and URL scheme keep
their original `grit` values because they are bound to the live Play listing.

## Features

- Email/password accounts (per-user data)
- One-tap beginner program: 3 short full-body days built from a curated shortlist of staple lifts
- 11 training systems (methodologies), grouped by experience level, + 6 weekly splits (Beginner Full Body, PPL, Upper/Lower, Bro, Full Body, Push/Pull)
- Automatic weekly plan generation (full-gym exercises)
- Day-by-day workout view with target sets × reps
- Live workout logging (sets, reps, weight) with rest timer
- Session history, streaks, and profile stats
- XP, levels, and 22 badges earned from your own logged history
- Exercise library with muscle filters (~190 movements)
- In-app account deletion (store-ready)
- Active plan saved to your Supabase account

## Prerequisites

- Node.js 22.13+
- [Expo Go](https://expo.dev/go) on a phone, or an iOS/Android simulator
- A free [Supabase](https://supabase.com) project

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run in order:
   - `supabase/migrations/001_init.sql` (schema + RLS + profile trigger)
   - `supabase/seed.sql` (split templates + curated exercises)
   - `supabase/migrations/002_sessions.sql` (live workout logging, streaks, history)
   - `supabase/migrations/003_account_deletion.sql` (in-app account deletion)
   - `supabase/migrations/004_progression.sql` (XP, levels, badges, best streak — backfills existing history)
   - `supabase/migrations/005_security_and_atomic_plans.sql` (transactional program save, ownership checks)
   - `supabase/migrations/006_custom_programs.sql` (custom-program catalog marker)
   - `supabase/migrations/007_atomic_sessions.sql` (one-request, transactional workout start/finish)
   - `supabase/migrations/008_server_owned_progress.sql` (only the server functions can change progress, completed sessions and logged sets; daily limit for "Describe your week"; size caps). Apply 008 **before** deploying the updated `plan-intent` function, which refuses calls until the quota function exists.
3. Copy **Project URL** and **anon public** key from **Project Settings → API**.
4. Create env file:

```bash
cp .env.example .env
```

Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Auth settings (recommended for local dev)

In Supabase **Authentication → Providers → Email**:

- Enable Email provider
- For faster local testing, you can **disable “Confirm email”** so sign-up logs you in immediately

### 4. Run the app

```bash
npx expo start
```

Then press `i` / `a` for simulators, `w` for web, or scan the QR code with Expo Go.

## Describe your week (TypeSafe)

People can type how they want to train ("four days at home with dumbbells, bigger arms") instead of walking the picker. The `plan-intent` Supabase Edge Function sends that text to [TypeSafe](https://docs.typesafe.ai) with a fixed set of questions: which training style, how many days, and which equipment. The app turns the typed answers into a style, split, and equipment list in `src/domain/planIntent.ts`, shows them for review with anything uncertain marked "Check this", and only then generates the plan. The TypeSafe key stays on the server.

Setup (once):

```bash
supabase secrets set TYPESAFE_API_KEY=...
supabase functions deploy plan-intent
```

Before deploying, check how real wording is read:

```bash
TYPESAFE_API_KEY=... npx tsx scripts/try-plan-intent.ts
TYPESAFE_API_KEY=... npx tsx scripts/try-plan-intent.ts "3 days, home, bands only"
```

Without the function deployed, the screen shows an error and a link to the manual picker. The questions live in `supabase/functions/_shared/planIntentQuestions.ts`; `npm run test:intent` fails if their options drift from the app's styles or catalog equipment.

## Keeping the backend online

Supabase pauses free-plan projects after a week without database activity, which takes the app offline until the project is restored by hand. `.github/workflows/keep-supabase-awake.yml` queries the database every two days to prevent that. It needs two repository secrets, `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the same values as the app's `.env`). A failed run means the project is paused or the secrets are wrong, and GitHub emails the owner. Run it once by hand from the Actions tab after adding the secrets. The Supabase Pro plan never pauses and makes the job unnecessary.

## Project structure

```
app/                    # Expo Router screens
  (auth)/               # Login & signup
  (app)/                # Authenticated app
    (tabs)/             # Train, Program, Library, You
    history.tsx         # Session log (reached from Train → Recent)
    splits/             # Describe-your-week, methodology + split picker, plan preview
    plan/               # Week & day views
    workout/            # Live session player
src/
  domain/               # Types, catalog, plan generator, methodologies
  hooks/                # Auth, plans, exercises, sessions
  components/           # UI pieces
  lib/supabase.ts       # Supabase client
supabase/
  functions/            # plan-intent edge function (TypeSafe)
  migrations/           # Schema + RLS
  seed.sql              # Catalog seed (auto-generated with curate script)
scripts/
  curate-exercises.mjs  # Refresh exercise library from free-exercise-db
```

## Where workouts come from

| Layer | Source |
|--------|--------|
| **Exercise movements** | Curated from **[yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)** (Unlicense / public domain). ~190 full-gym lifts after filtering. |
| **Training systems** | Style guides in `src/domain/methodologies.ts` inspired by *publicly documented* principles. **Not official products** of any named coach or brand. |
| **Weekly structure** | Split templates in `src/domain/catalog.ts`. Every day in a split declares the same number of focus muscles, and A/B days declare identical ones, so each session runs the same length and each muscle gets a fixed weekly frequency. |
| **Assembly** | `src/domain/planGenerator.ts` scores exercises by muscle + methodology biases |
| **Beginner selection** | `preferredExerciseNames` on a methodology names exact catalog lifts to pick first, so a first program gets a barbell squat rather than a Jefferson squat |

The app reads exercises from the bundled `exercises.generated.ts` at runtime. Supabase catalog tables exist for foreign-key integrity when saving plans — keep them in sync via the curate script.

Refresh the library:

```bash
curl -sL https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json -o /tmp/free-exercises.json
npm run curate:exercises
# Re-run supabase/seed.sql in Supabase so IDs match
```

The exercise data is released under the Unlicense (public domain), which needs no attribution, so the app shows none. Training styles have generic names and never name a person, brand, book or program; plan titles saved under earlier style names are renamed on display by `displayPlanName`.

## Plan generation

1. Choose a **training system** (methodology)
2. Choose a **weekly split**
3. Generator picks open-catalog exercises using that system’s scoring rules
4. Save to `workout_plans` / `plan_days` / `plan_exercises` (RLS)

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Open Android |
| `npm run ios` | Open iOS (macOS) |
| `npm run web` | Run in browser |
| `npm test` | Run every domain suite |
| `npm run test:generator` | Sanity-check plan generation for all splits |
| `npm run test:progression` | XP curve, level boundaries, badge unlocks |
| `npm run curate:exercises` | Refresh exercise catalog + seed.sql |
| `npm run typecheck` | TypeScript check |

## Security notes

- User tables are protected with **Row Level Security** (`user_id = auth.uid()`).
- Only the **anon** key is embedded in the app (via `EXPO_PUBLIC_*`). Never put the service role key in the client.
- Catalog tables are readable by authenticated users; only user plan tables are writable by the owner.
- `.gitignore` denies `.env.*` by default and opts `.env.example` back in, so a new `.env.production` cannot be committed by accident. Signing material (`*.jks`, `*.keystore`, `*.p8`, `*.p12`, `*.pem`), any `*service-account*.json`, and signed build output (`*.aab`, `*.apk`, `*.ipa`) are ignored too.
- **This repository is public.** Anything committed here is permanent and world-readable — treat every file as published before you `git add` it.

## Store release

- **Google Play:** [PLAY_STORE.md](PLAY_STORE.md) — full Android submission guide
- **iOS & shared:** [STORE_RELEASE.md](STORE_RELEASE.md) — EAS builds and App Store submission

## Roadmap

- Progressive overload suggestions
- Push notifications for rest timers
- Persist chosen methodology on saved plans

## License

See repository license file if present.

## Validation and security

Use Node 22.13 or newer, then `npm ci` and `npm run validate`.
`npm run export:web` verifies the static web build.
See [SECURITY.md](SECURITY.md) for migration order, native session storage,
remaining dependency advisories, and release verification requirements.

## Offline-safe workouts and public policy pages

The live workout is saved on the phone after every change (`src/domain/workoutDraft.ts`,
`src/lib/workoutStore.ts`), so a crash, a killed app or a dead battery reopens it
exactly where it was, even with no signal. A finish that cannot reach the server
(an error, or no answer within 15 seconds) goes to an on-phone outbox and is sent
by `useOutboxSync` on sign-in, on return to the app and every minute; Home shows
what is waiting. Completion is idempotent on the server, so a retry never counts
a workout twice. Covered by `test:draft`.

The privacy policy and terms are published from `docs/` with GitHub Pages
(Settings → Pages → branch `main`, folder `/docs`), at
`https://saipraneethpb1.github.io/grit/privacy.html` and `/terms.html`. They are
generated from `src/domain/legalContent.ts`, the same text the app shows; run
`npm run build:legal` after editing it.

## The coach

`src/domain/coach.ts` (covered by `test:coach`) makes the training decisions a
coach would, from logged sets alone:

- **Next session, per exercise** (`prescribe`): double progression. Earn the top
  of the rep range on every working set, then add an equipment-aware jump (about
  5% for lower-body compounds, 2.5% elsewhere, rounded to loadable plates and
  dumbbells) and restart at the bottom. Inside the range: same load, one more
  rep. Two sessions short of the range, or three without an estimated-1RM gain:
  reset about 10%. Bodyweight work progresses reps, then variation. Effort is
  reps in reserve (2 on compounds, 1 on isolation, one more for beginners, one
  fewer on the last set); rest follows load and rep range; the first compound
  gets ramp-up warm-up sets.
- **Readiness** (`trainingReadiness`): two weeks off eases loads in 15% lighter;
  a week at 1.5× usual sets (against a real four-week baseline) holds volume;
  six hard weeks in a row prescribe a deload (half the sets, about 85% loads).
- **Weekly volume** (`weeklyVolume`, `tuneWeeklyVolume`): hard sets per muscle
  against ranges that widen with training age (inferred from workouts
  completed). The generator trims or adds single sets until each focus muscle
  lands in range, without unbalancing session lengths or touching the high-intensity or pump-finisher
  set schemes, and plan screens show each muscle against its band and weekly
  frequency.

The workout player pre-fills each exercise from the coach and shows the call,
its reason, RIR, rest and warm-ups; home shows the week's readiness. One
batched query feeds both the coach and "previous best". These are coaching
heuristics from common strength-and-conditioning practice, not medical advice.

## Training calendar and home-screen widgets

The Progress tab opens with a **training calendar**: a GitHub-style grid of the
last 20 weeks, shaded by completed sets per day (rest, then 1–9, 10–19, 20–29
and 30+). Tap a day for its workouts, sets and volume. Underneath: active days,
the current and best run of consecutive training weeks (weeks, so planned rest
days never break a run) and the weekday you train most (`dailyActivity`,
`activitySummary` in `src/domain/analytics.ts`).

Two **home-screen widgets** share one snapshot built by `buildWidgetSnapshot`
(`src/domain/widgetSnapshot.ts`, covered by `test:widgets`) and written by
`useWidgetSync` whenever the plan, profile or history changes:

- **Today**: today's session, program position and summary, this week's heat
  row and a Start action that opens the workout. iOS small, medium and Lock
  Screen rectangular; Android 2×2 resizable, with the exercise preview from
  about four cells wide.
- **Streak**: the streak, workouts this week against the program's days and
  the seven-day heat row. iOS small plus Lock Screen circular and inline;
  Android 2×2.

iOS widgets use `expo-widgets` (SwiftUI via `@expo/ui`, `src/widgets/ios.tsx`);
their layouts run in the widget extension's own runtime, so they inline every
value. Android widgets use `react-native-android-widget`
(`src/widgets/android.tsx`), drawn from the stored snapshot by the headless task
registered in `index.ts`. Both need a development or store build; Expo Go skips
them. EAS provisions the iOS extension (`com.praneeth.grit.ExpoWidgetsTarget`)
and the `group.com.praneeth.grit` app group from the plugin config.

## Progress analytics

The Progress tab maps training onto the same anatomical artwork style as the
exercise demonstrations (`assets/anatomy/bodymap/bodymap.webp`, front and back
figures). Each muscle group is a region (`src/domain/bodyMap.ts`) tinted violet
by its average weekly sets over the chosen window: none, under 4, 4–10 and 10+.
Tints are clipped to a silhouette traced from the artwork, so they never spill
onto the background. Tapping a region selects that muscle; the ranked list
below the map gives the same values. Exercise guides reuse the map for prime and
secondary muscles.

The **training balance** web plots all twelve groups on one radar. It orders
neighbouring axes by related muscles, marks the 10-set guideline as a dashed
ring, and overlays the previous window. Pull : push ratio, lower-body share and
groups at 4+ sets summarise it (`trainingBalance` in `src/domain/analytics.ts`,
covered by `test:analytics`).

## Exercise demonstrations

Tap **How to perform** under the active exercise in a workout, or on an exercise's
library detail page. The modal preserves logged sets and shows an anatomical
demonstration, playback controls, manual pose stepping and numbered instructions.

All **189 exercises** have individually reviewed anatomical illustrations with gray
muscle fibers and coral target-muscle emphasis. These are authored position sequences
with short crossfades, not continuous 3D movement or an anatomical simulation. Repeated
hold poses remain visible; reduced-motion settings disable automatic playback and
crossfades while retaining manual stepping. Neck isometrics show stationary resistance.
Compound movements use explicit sequences, including the clean catch before a press
and lockout between a press and skull crusher. Every figure has a featureless mannequin head, and every barbell sheet shows the whole bar,
both hands and a plate on each sleeve.

Simple movements play only their **start and end positions**, holding each for 1.8 s and
labelled "Start" and "End". Sixteen multi-phase, alternating or two-direction movements keep
every authored pose (for example Clean and Press, Cuban Press, Zottman Curl, the alternating
curls and presses, Flutter Kicks and Rocking Standing Calf Raise). Neck isometrics show one
held pose per side.

`data/exercise-anatomy.json` records exact source identities, review status, phase labels
and pose order. The library, details and workout guides share the same selection.
Unreviewed artwork cannot display. The exact exercise rig remains available if artwork
is missing or fails to decode. Original source photographs are retained for reference;
they are not displayed as replacement demonstrations.

Full sheets and 256px thumbnail sheets are bundled offline as WebP (approximately
23 MB for all 189 pairs). Authoring imports require the libvips CLI (`vips`); runtime
playback and coverage tests do not. `npm run test:anatomy` checks reviewed coverage
(only the listed redraws may be missing), source identities, pose sequences, dimensions and offline asset bindings.

To import newly authored anatomical sheets, run
`node scripts/prepare-anatomical-demos.mjs --import <exercise-id> <image-path>`.
Compare all four poses with the exact source positions and instructions before
running the same command with `--reviewed <exercise-id>`. Generate a local review
page using `node scripts/preview-anatomical-demos.mjs /tmp/grit-anatomy-review`.

All 189 guides and the figure animations work offline. The repository also retains
378 JPEG source frames (approximately 25 MB); the demonstration UI does not import
them. No video service, tracking embed, or API key is required.
Photos and instructions come from the existing [free-exercise-db source](https://github.com/yuhonas/free-exercise-db)
under its [Unlicense](assets/exercises/LICENSE.md), matched using exact source IDs.

To refresh guidance, download that repository's `dist/exercises.json`, then run
`node scripts/import-exercise-guides.mjs /path/to/exercises.json`.
The importer preserves curated IDs and training targets. Reviewed instruction corrections
in `data/exercise-guide-overrides.json` are applied during guide imports and catalog curation. Run `npm run test:guides`
to verify coverage, source mappings, and bundled images.

## Custom programs

Open **New program → Build a custom program**. Name and order 1–7 training days,
add exercises from the library, set individual set counts and rep ranges, then
review and activate. The new program replaces the active routine without deleting
past sessions. Days run in the order you choose; rest days do not need entries.
Drafts stay in the builder while moving between steps; leaving requires confirmation.
Drafts are not persisted across app termination.

Apply migration `006_custom_programs.sql` after migration 005 before saving a custom
program. It adds the custom-program catalog marker; ownership and transaction
checks remain in the existing save RPC. No live migration is applied automatically.

Exercise screens show three short starting cues below the demo button. The demo
sheet includes short steps plus **Read full instructions** for complete source
technique details. Editorial cue overrides are stored separately so refreshing the
source data does not overwrite them.
