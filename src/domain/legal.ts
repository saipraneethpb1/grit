/**
 * Public legal documents linked from auth and profile screens.
 *
 * Set EXPO_PUBLIC_PRIVACY_POLICY_URL and EXPO_PUBLIC_TERMS_URL to hosted URLs
 * before Play Store submission (required by Google Play). Until then, the app
 * opens in-app legal screens at /legal/privacy and /legal/terms.
 *
 * Host the markdown files in /legal on GitHub Pages, Vercel, or similar.
 * See PLAY_STORE.md.
 */
/** Only https URLs are opened outside the app. Anything else falls back to the in-app screen. */
export function hostedLegalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const LEGAL_LINKS: { terms: string | null; privacy: string | null } = {
  terms: hostedLegalUrl(process.env.EXPO_PUBLIC_TERMS_URL),
  privacy: hostedLegalUrl(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
};

export const LEGAL_ROUTES = {
  terms: '/legal/terms',
  privacy: '/legal/privacy',
} as const;

export const LEGAL_PENDING_MESSAGE =
  'Privacy policy and terms are available in the app. Ryvora stores your account email, plans, and logged sets in Supabase — nothing else.';
