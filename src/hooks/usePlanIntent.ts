import { useMutation } from '@tanstack/react-query';
import type { PlanIntentAnswers } from '@/supabase/functions/_shared/planIntentQuestions';
import { interpretPlanIntent, type PlanIntent } from '@/src/domain/planIntent';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

const MESSAGES: Record<string, string> = {
  not_configured: 'This feature is not switched on yet.',
  rate_limited: 'Too many requests right now. Try again in a minute.',
  description_too_long: 'That description is too long. Keep it under 500 characters.',
  empty_description: 'Write a sentence or two about how you train first.',
};

const FALLBACK = "Couldn't read that right now. You can pick your program by hand instead.";

/** Reads the error code the plan-intent function returns in its JSON body. */
async function messageFor(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error && MESSAGES[body.error]) return MESSAGES[body.error];
    } catch {
      // Not JSON: fall through to the generic message.
    }
  }
  return FALLBACK;
}

/**
 * Sends the person's description to the `plan-intent` edge function and
 * interprets TypeSafe's answers locally. The function only ever returns raw
 * answers; every rule about what they mean lives in src/domain/planIntent.ts.
 */
export function usePlanIntent() {
  return useMutation({
    mutationFn: async (description: string): Promise<PlanIntent> => {
      if (!isSupabaseConfigured) throw new Error(MESSAGES.not_configured);
      const { data, error } = await supabase.functions.invoke<{ answers: PlanIntentAnswers }>(
        'plan-intent',
        { body: { description } }
      );
      if (error) throw new Error(await messageFor(error));
      if (!data?.answers) throw new Error(FALLBACK);
      return interpretPlanIntent(data.answers);
    },
  });
}
