# Grit

Mobile workout planner: pick a training system and weekly split, get full-gym workouts by muscle group, log sets live, and save your plan to your account.

Built with **Expo (React Native)**, **Expo Router**, **TypeScript**, and **Supabase** (Auth + Postgres + RLS).

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

- Node.js 20+
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

See **Profile → Sources & attribution** in the app.

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
- Custom user-defined splits
- Push notifications for rest timers
- Persist chosen methodology on saved plans

## License

See repository license file if present.

## Validation and security

Use Node 22.13 or newer, then `npm ci` and `npm run validate`.
`npm run export:web` verifies the static web build.
See [SECURITY.md](SECURITY.md) for migration order, native session storage,
remaining dependency advisories, and release verification requirements.

## Exercise demonstrations

Tap **How to perform** under the active exercise in a workout, or on an exercise's
library detail page. The modal preserves your logged sets and contains a looping
two-position photo demonstration, pause/step controls, and complete numbered
instructions. Reduced-motion settings disable automatic playback. These are
position demonstrations, not full-motion videos.

All 189 guides and 378 JPEG frames are bundled for offline access (approximately
25 MB of source images); no video service, tracking embed, or API key is required.
Photos and instructions come from the existing [free-exercise-db source](https://github.com/yuhonas/free-exercise-db)
under its [Unlicense](assets/exercises/LICENSE.md), matched using exact source IDs.

To refresh guidance, download that repository's `dist/exercises.json`, then run
`node scripts/import-exercise-guides.mjs /path/to/exercises.json`.
The importer preserves curated IDs and training targets. Run `npm run test:guides`
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
