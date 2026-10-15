# Security and release notes

## Deployment order

Apply migrations 001–004, then `supabase/migrations/005_security_and_atomic_plans.sql`,
`supabase/migrations/006_custom_programs.sql`, and `supabase/migrations/007_atomic_sessions.sql`
before releasing this client. Program saving now requires `save_generated_plan`;
there is deliberately no fallback to partially committed client writes.
Workout start and finish require `start_workout_session` and `complete_workout_session`.
Until 007 is applied, the client falls back to its own writes; that fallback refuses to
overwrite profile counters when the profile read fails, and a retried finish does not
double-count a session that was already saved.
Migration 005 saves programs transactionally and adds restrictive ownership checks
for session plans, days, and planned exercises. Back up the database before migration.

Rebuild the native apps to include Expo SecureStore. Native sessions migrate from
AsyncStorage to encrypted storage on first access; plaintext is removed only after
the encrypted write succeeds. Storage errors fail the operation without falling
back to plaintext. Test existing-user migration, sign-in, restart, background/resume,
and sign-out on real Android and iOS devices. Large session payloads can be rejected
by native storage and should be included in device testing.

Web sessions still use browser storage. Preventing XSS remains essential; configure
HTTPS and security headers at your hosting provider. Never put a service-role or
secret Supabase key into EXPO_PUBLIC variables. Public client keys rely on database
RLS for authorization.

## Authentication configuration

The signup UI requires 12 characters. Set the same minimum in Supabase Auth so
requests bypassing the UI are also checked. Enable email confirmation and configure
production SMTP, rate limits, and compromised-password protection as appropriate.
These hosted settings are not changed by this repository update.

## Dependency audit (2026-09-11)

Compatible updates reduced npm audit findings from 26 (10 high, 16 moderate) to
18 (4 high, 14 moderate). Remaining dependency chains involve image-size/Metro,
decode-uri-component/query-string/Expo Router, and uuid/xcode/Expo tooling.
Counts include dependent packages, not just distinct vulnerabilities.

Do not use `npm audit fix --force` blindly: its current suggestions include Expo
and Router downgrades incompatible with SDK 57. Recheck `npm run audit:security`
when upstream fixes become available. Avoid processing untrusted image assets in
build tooling. The remaining findings mean this is not a clean security audit.

## Verification and remaining limits

`npm run validate` checks TypeScript and training-domain regressions. CI also checks
Expo dependency alignment and exports the web app. The local PostgreSQL regression suite verifies migration execution, rollback,
owner isolation, cross-account session rejection, and anonymous RPC rejection.
Native storage still requires device testing; live Supabase deployment is untested.

With migration 007 applied, finishing a workout is one transaction: sets, session
status, and profile counters commit together, and the profile row is locked so two
devices cannot overwrite each other's XP. A retry after a lost response does not
count the session twice. Profile totals remain client-writable under owner RLS on
databases that have not applied 007. Do not use those totals for trusted rankings
or rewards.
