export const PRIVACY_POLICY = `Privacy Policy — Ryvora

Last updated: October 2026

Ryvora ("we", "the app") is a strength-training planner and workout log operated by the developer listed on the Google Play store listing.

What we collect
• Account information: email address and optional display name when you sign up.
• Workout data: training plans, logged sets (weight, reps), session history, and profile stats (streak, workouts completed).
• Technical data: standard authentication tokens required to keep you signed in.
• Program descriptions: if you use "Describe your week", the text you type is sent to TypeSafe to read it. It is not stored with your account. The questions it answers include training experience and any injury or joint problem you mention, so this text can contain health details. Leave them out if you prefer; the feature works without them, and you can always pick a program by hand.

What we do not collect
• Location, contacts, photos, microphone, or camera data.
• Health data outside what you voluntarily log as workout sets.
• Payment information (the app is free).

How data is stored
Your data is stored in Supabase (hosted PostgreSQL) with row-level security so only your account can access your plans and logs. Data is transmitted over HTTPS.

On your device
• While a workout is open, its logged sets are saved on your phone so a crash or a closed app does not lose them. The saved copy is removed when the workout is saved to your account or when you leave it.
• If you finish a workout with no connection, it stays on your phone until it can be sent, then it is removed.
• Home-screen widgets, if you add them, keep a short summary (today's session name, streak, this week's training days) on your phone so they can display it.
• Training recommendations (loads, reps, rest, volume) are calculated on your device from your own logged sets.

How we use data
• To provide the service: sync plans, log workouts, show history and streaks.
• To authenticate your account and protect access to your data.

Data deletion
You can delete your account and all associated data from Profile → Delete account. This permanently removes your profile, plans, sessions, and logged sets. Uninstalling the app removes the copies kept on your phone.

Third parties
• Supabase provides authentication and database hosting under their privacy policy.
• TypeSafe (typesafe.ai) reads the text you type into "Describe your week" to suggest a program. Only that text is sent: no email, name, or workout history. Each account can use it a limited number of times a day.
• We do not sell your personal data.

Children
Ryvora is not directed at children under 13. We do not knowingly collect data from children.

Contact
Use the support email listed on the Google Play store listing for privacy questions or deletion requests.

Changes
We may update this policy. Continued use after changes means you accept the updated policy.`;

export const TERMS_OF_SERVICE = `Terms of Service — Ryvora

Last updated: October 2026

By using Ryvora you agree to these terms.

The service
Ryvora provides workout planning and logging tools for informational purposes. It is not medical advice. Consult a physician before starting any exercise program.

Your account
You are responsible for keeping your login credentials secure. You must provide accurate information when creating an account.

Acceptable use
Do not misuse the service, attempt unauthorized access, or interfere with other users' data.

Your content
Workout logs and plans you create remain yours. You grant us permission to store and process them solely to operate the app.

Disclaimer
Workouts are generated from exercise metadata and public training methodologies. You train at your own risk. We are not liable for injury or loss arising from use of the app.

Termination
You may delete your account at any time. We may suspend accounts that violate these terms.

Changes
We may update these terms. Continued use after changes constitutes acceptance.

Contact
Use the support email listed on the Google Play store listing for questions about these terms.`;
