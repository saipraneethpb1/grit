# Grit

Mobile workout planner: pick a training system and weekly split, get full-gym workouts by muscle group, log sets live, and save your plan to your account.

Built with **Expo (React Native)**, **Expo Router**, **TypeScript**, and **Supabase** (Auth + Postgres + RLS).

## Features

- Email/password accounts (per-user data)
- 10 training systems (methodologies) + 5 weekly splits (PPL, Upper/Lower, Bro, Full Body, Push/Pull)
- Automatic weekly plan generation (full-gym exercises)
- Day-by-day workout view with target sets × reps
- Live workout logging (sets, reps, weight) with rest timer
- Session history, streaks, and profile stats
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

## Project structure

```
app/                    # Expo Router screens
  (auth)/               # Login & signup
  (app)/                # Authenticated app
    (tabs)/             # Train, Log, Library, You
    splits/             # Methodology + split picker, plan preview
    plan/               # Week & day views
    workout/            # Live session player
src/
  domain/               # Types, catalog, plan generator, methodologies
  hooks/                # Auth, plans, exercises, sessions
  components/           # UI pieces
  lib/supabase.ts       # Supabase client
supabase/
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
| **Weekly structure** | Split templates in `src/domain/catalog.ts` |
| **Assembly** | `src/domain/planGenerator.ts` scores exercises by muscle + methodology biases |

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
| `npm run test:generator` | Sanity-check plan generation for all splits |
| `npm run curate:exercises` | Refresh exercise catalog + seed.sql |
| `npm run typecheck` | TypeScript check |

## Security notes

- User tables are protected with **Row Level Security** (`user_id = auth.uid()`).
- Only the **anon** key is embedded in the app (via `EXPO_PUBLIC_*`). Never put the service role key in the client.
- Catalog tables are readable by authenticated users; only user plan tables are writable by the owner.

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
