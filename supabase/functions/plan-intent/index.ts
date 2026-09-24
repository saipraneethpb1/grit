// Reads a person's plain-language description of their training week with
// TypeSafe and returns the raw typed answers. The app turns them into a
// program in src/domain/planIntent.ts, so every rule stays testable and the
// TypeSafe key never leaves the server.
//
// Deploy:  supabase functions deploy plan-intent
// Secret:  supabase secrets set TYPESAFE_API_KEY=...
//
// Supabase verifies the caller's JWT before this runs (verify_jwt defaults to
// true), so only signed-in users can spend the key.

import {
  buildPlanIntentRequest,
  MAX_DESCRIPTION_LENGTH,
  TYPESAFE_ENDPOINT,
} from '../_shared/planIntentQuestions.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TIMEOUT_MS = 8000;
const RETRY_STATUSES = new Set([429, 529]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function callTypeSafe(apiKey: string, payload: unknown): Promise<Response> {
  const send = () =>
    fetch(TYPESAFE_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  let res = await send();
  // One retry after a short backoff; a person is waiting on the other end, so
  // anything longer should fail fast and let the app offer the manual picker.
  if (RETRY_STATUSES.has(res.status)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    res = await send();
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('TYPESAFE_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  let description: unknown;
  try {
    ({ description } = await req.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof description !== 'string' || !description.trim()) {
    return json({ error: 'empty_description' }, 400);
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return json({ error: 'description_too_long' }, 400);
  }

  let res: Response;
  try {
    res = await callTypeSafe(apiKey, buildPlanIntentRequest(description.trim()));
  } catch {
    return json({ error: 'upstream_unavailable' }, 502);
  }

  if (!res.ok) {
    // Log the status only. The description is the person's own words and has
    // no place in function logs.
    console.error(`typesafe responded ${res.status}`);
    return json({ error: res.status === 429 ? 'rate_limited' : 'upstream_error' }, 502);
  }

  const body = await res.json();
  if (body?.usage) {
    console.log(`typesafe usage in=${body.usage.input_tokens} out=${body.usage.output_tokens}`);
  }
  return json({ answers: body.answers ?? {} });
});
