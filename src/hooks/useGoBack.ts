import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Back, or `fallback` when there is nothing to go back to. A screen opened
 * straight from a URL (web, a shared link) has no history, and a bare
 * `router.back()` there dispatches a GO_BACK that no navigator handles.
 */
export function useGoBack(fallback: Href = '/(app)/(tabs)') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
