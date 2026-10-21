# Security and release notes

## Deployment order

Apply migrations 001–004, then `supabase/migrations/005_security_and_atomic_plans.sql`
and `supabase/migrations/006_custom_programs.sql` before releasing this client. Apply `007_atomic_sessions.sql` after 006 for transactional workout start/finish (the client falls back to the older request-by-request flow until it is applied), then `008_server_owned_progress.sql` and `009_progress_integrity.sql`. Program saving now requires `save_generated_plan`;
there is deliberately no fallback to partially committed client writes.
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

## Dependency audit (2026-10-17)

After the Expo 57.0.30 patch alignment and the compatible `npm audit fix`, npm
audit reports 30 findings (19 high, 11 moderate, no critical; the critical
`shell-quote` advisory was fixed). The high findings trace to three chains in
build tooling rather than app runtime code: braces/micromatch under Metro's file
map, image-size under Metro, and node-forge under Expo's code-signing tooling.
Counts include every dependent package, so `expo`, `react-native` and Metro are
listed because they depend on those chains, not because of their own advisories.
The moderate findings come from decode-uri-component (via query-string in Expo
Router, which does run in the app to parse URLs) and uuid (via Expo's xcode
tooling).

Do not use `npm audit fix --force` blindly: its current suggestions include Expo
and Router downgrades incompatible with SDK 57. Recheck `npm run audit:security`
when upstream fixes become available. Avoid processing untrusted image assets in
build tooling. The remaining findings mean this is not a clean security audit.

## Verification and remaining limits

`npm run validate` checks TypeScript and training-domain regressions. CI also checks
that installed Expo packages match the ranges bundled with the locked Expo SDK
(`npm run check:expo`, offline, so a newly published Expo patch cannot fail the build)
and exports the web app. The local PostgreSQL regression suite verifies migration execution, rollback,
owner isolation, cross-account session rejection, and anonymous RPC rejection, plus
migration 007's atomic session start/finish, retry idempotence, and SQL/TypeScript
parity of the streak, rotation, and XP rules.
Native storage still requires device testing; live Supabase deployment is untested.

With migrations 007–009 applied, workout completion is one server transaction
(`complete_workout_session`) that locks the profile row. Progress columns, completed
sessions, and logged sets cannot be written by a normal client request. Each saved
set has to be one of that day's planned exercises, and the plan-intent quota ignores
caller-supplied ceilings above 10. Logged weight and reps are still the numbers the
person entered, so do not use profile totals for trusted rankings or rewards.
Hosted legal links are opened only when they are credential-free `https` URLs.
