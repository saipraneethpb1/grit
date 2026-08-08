# Grit mobile release

The project is configured for EAS production builds with these permanent app identifiers:

- iOS bundle identifier: `com.praneeth.grit`
- Android application ID: `com.praneeth.grit`

Change them **before the first store release** if you want a different identifier. They cannot be changed for an existing App Store or Play Store listing.

## One-time accounts

1. Create an [Expo account](https://expo.dev/signup).
2. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) for iOS distribution.
3. Create a [Google Play Console](https://play.google.com/console/) developer account.
4. Create the Grit apps in App Store Connect and Play Console using the identifiers above.

## Configure the Expo project

```bash
npx eas-cli login
npx eas-cli init
```

`eas init` adds the Expo project ID to the app configuration. Commit that change.

The production build needs the two public Supabase values. Add them to the EAS `production` environment rather than committing `.env`:

```bash
npx eas-cli env:create production --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_URL --visibility plaintext
npx eas-cli env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_ANON_KEY --visibility sensitive
```

The Supabase anon key is designed for client use; database security must continue to rely on the existing Row Level Security policies.

Run `supabase/migrations/003_account_deletion.sql` in the production Supabase project. This enables the required in-app account deletion flow and cascades deletion through the user's workout data.

## Test release builds

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

The Android preview is an installable APK. The iOS preview targets the simulator. Test sign-up, login, plan creation, workout completion, history, sign-out, and account recovery before production submission.

## Production builds

```bash
npm run build:android
npm run build:ios
```

EAS can create and securely manage signing credentials during the first build. The Android production artifact is an AAB; the iOS artifact is an archive suitable for App Store Connect.

## Store submission

- **Google Play (step-by-step):** [PLAY_STORE.md](PLAY_STORE.md)
- **iOS:** follow the iOS sections below

Before submission, prepare:

- App name, subtitle/short description, full description, category, and support contact
- Public privacy-policy and support URLs
- Phone screenshots for the required iOS and Android sizes
- App Store privacy answers and Google Play Data safety disclosure covering account data and workout logs stored in Supabase
- App-review test credentials if reviewers cannot create their own account
- Google Play closed testing, if required for the developer account

Then submit the completed builds:

```bash
npm run submit:android
npm run submit:ios
```

Submission uploads a binary; approval and public release still happen in Play Console and App Store Connect.

## Versioning

The public version is `expo.version` in `app.json`. EAS remotely auto-increments iOS build numbers and Android version codes for production builds. Increase the public version for user-visible releases, such as `1.0.0` to `1.1.0`.
