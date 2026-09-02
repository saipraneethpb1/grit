# Google Play Store — Grit

Step-by-step guide to publish **Grit** on Google Play. The app is already configured for production Android builds (`com.praneeth.grit`, AAB output).

## Before you start

You need:

1. **Google Play Console** account — [one-time $25 fee](https://play.google.com/console/)
2. **Expo account** — [expo.dev/signup](https://expo.dev/signup)
3. **Production Supabase** project with all migrations applied (including `003_account_deletion.sql` and `004_progression.sql`)
4. **Public privacy policy URL** — required by Google Play (see step 3)

## 1. Link the project to Expo

```bash
npm install
npx eas-cli login
npx eas-cli init
```

`eas init` adds your Expo project ID to `app.json`. Commit that change.

## 2. Set production environment variables

EAS builds need your Supabase keys. Do **not** commit these:

```bash
npx eas-cli env:create production --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_URL --visibility plaintext
npx eas-cli env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_ANON_KEY --visibility sensitive
```

Optional — hosted legal URLs (recommended for Play Console):

```bash
npx eas-cli env:create production --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value https://YOUR_DOMAIN/privacy --visibility plaintext
npx eas-cli env:create production --name EXPO_PUBLIC_TERMS_URL --value https://YOUR_DOMAIN/terms --visibility plaintext
```

## 3. Publish a privacy policy (required)

Google Play **rejects** listings without a public privacy policy URL.

**Option A — Host the included markdown files**

1. Deploy `legal/privacy-policy.md` and `legal/terms-of-service.md` to GitHub Pages, Vercel, or Netlify.
2. Set the URLs in EAS env vars (step 2) and in Play Console.

**Option B — Use the in-app legal screens for now**

The app includes `/legal/privacy` and `/legal/terms`. Export the web build and deploy it:

```bash
npx expo export --platform web
```

Deploy the `dist/` folder to any static host. Use URLs like:

- `https://your-site.com/legal/privacy`
- `https://your-site.com/legal/terms`

## 4. Test a release build

```bash
npx eas-cli build --platform android --profile preview
```

Install the APK on a physical device. Test:

- Sign up / sign in
- Create a program
- Complete a workout (check green completion indicator on home)
- View history
- Sign out
- Delete account

## 5. Build the production AAB

```bash
npm run build:android
```

EAS produces an **Android App Bundle** (`.aab`) — the format Google Play requires. On first build, EAS will prompt to create an Android keystore; let it manage credentials.

## 6. Create the Play Console listing

1. Go to [Google Play Console](https://play.google.com/console/)
2. **Create app** → name: **Grit**
3. Use package name: `com.praneeth.grit` (must match `app.json`)
4. Complete **App content** questionnaires:
   - **Privacy policy** — paste your public URL
   - **Data safety** — declare:
     - Email (account)
     - App activity: workout logs, fitness info (user-provided sets/reps)
     - Data encrypted in transit (HTTPS)
     - Users can request deletion (in-app Delete account)
   - **Target audience** — not designed for children
   - **Ads** — No, Grit does not contain ads

5. **Store listing**:
   - Short description (80 chars): `Strength training planner and workout log with smart program generation.`
   - Full description: expand on features from README
   - App icon: `assets/images/grit-icon.png` (1024×1024)
   - Feature graphic: 1024×500 (create in any design tool)
   - Phone screenshots: at least 2 (1080×1920 or similar)
   - Category: **Health & Fitness**
   - Contact email: your support address

## 7. Upload and submit

**Option A — EAS Submit (recommended)**

1. Create a [Google Play service account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md) with Play Console API access.
2. Download the JSON key as `google-service-account.json` (add to `.gitignore`).
3. Update `eas.json` submit section if needed:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "production",
      "releaseStatus": "completed"
    }
  }
}
```

4. Submit:

```bash
npm run submit:android
```

**Option B — Manual upload**

1. Download the `.aab` from the EAS build page
2. Play Console → **Release** → **Production** (or **Internal testing** first)
3. Upload the AAB and roll out

## 8. Review timeline

- **Internal testing** — available within hours
- **Production review** — typically 1–7 days for new apps
- New developer accounts may require **closed testing** with 20 testers for 14 days before production access

## Checklist

- [ ] `eas init` completed, project ID in `app.json`
- [ ] Production Supabase env vars in EAS
- [ ] All SQL migrations run on production Supabase
- [ ] Privacy policy hosted at a public URL
- [ ] Preview APK tested on a real device
- [ ] Production AAB built
- [ ] Play Console listing complete (screenshots, descriptions, data safety)
- [ ] AAB uploaded and submitted for review

## Version updates

For each new release:

1. Bump `version` in `app.json` (e.g. `1.0.0` → `1.1.0`)
2. Run `npm run build:android`
3. Run `npm run submit:android`

EAS auto-increments `versionCode` for production builds.

## Support

See also [STORE_RELEASE.md](STORE_RELEASE.md) for iOS and shared release notes.
