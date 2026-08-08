/**
 * Curate yuhonas/free-exercise-db (Unlicense / public domain) into Grit's gym library.
 *
 * Usage:
 *   curl -sL https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json -o /tmp/free-exercises.json
 *   node scripts/curate-exercises.mjs
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Deterministic valid UUID (v4-shaped) from a stable string key. */
function uuidFromKey(key) {
  const h = crypto.createHash('md5').update(`grit-exercise:${key}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    `a${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join('-');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const input = process.argv[2] || '/tmp/free-exercises.json';

if (!fs.existsSync(input)) {
  console.error('Missing', input);
  console.error('Download free-exercise-db dist/exercises.json first.');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));

const muscleMap = {
  abdominals: 'core',
  hamstrings: 'hamstrings',
  adductors: 'glutes',
  quadriceps: 'quads',
  biceps: 'biceps',
  shoulders: 'shoulders',
  chest: 'chest',
  'middle back': 'back',
  calves: 'calves',
  glutes: 'glutes',
  'lower back': 'back',
  lats: 'back',
  triceps: 'triceps',
  traps: 'traps',
  forearms: 'forearms',
  neck: 'traps',
  abductors: 'glutes',
};

const equipMap = {
  'body only': 'bodyweight',
  machine: 'machine',
  kettlebells: 'kettlebell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  barbell: 'barbell',
  bands: 'band',
  'e-z curl bar': 'ez_bar',
};

const allowEquip = new Set([
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'ez_bar',
  'kettlebell',
  'bodyweight',
  'band',
]);

function pattern(force, mechanic, name, primary) {
  const n = name.toLowerCase();
  if (primary.includes('core') || n.includes('crunch') || n.includes('plank')) return 'core';
  if (n.includes('lunge')) return 'lunge';
  if (n.includes('squat') || n.includes('leg press')) return 'squat';
  if (
    n.includes('deadlift') ||
    n.includes('rdl') ||
    n.includes('good morning') ||
    n.includes('hip thrust')
  )
    return 'hinge';
  if (n.includes('row') || n.includes('face pull')) return 'horizontal_pull';
  if (
    n.includes('pulldown') ||
    n.includes('pull-up') ||
    n.includes('pullup') ||
    n.includes('chin')
  )
    return 'vertical_pull';
  if (n.includes('bench') || n.includes('push-up') || n.includes('chest press') || n.includes('fly'))
    return 'horizontal_push';
  if (
    n.includes('overhead') ||
    n.includes('shoulder press') ||
    n.includes('military') ||
    n.includes('dip')
  )
    return 'vertical_push';
  if (mechanic === 'isolation') return 'isolation';
  if (force === 'push') return primary.includes('shoulders') ? 'vertical_push' : 'horizontal_push';
  if (force === 'pull') return 'horizontal_pull';
  return mechanic === 'compound' ? 'horizontal_push' : 'isolation';
}

function defaults(level, mechanic, pat) {
  if (pat === 'core') return { sets: 3, min: 10, max: 15 };
  if (mechanic === 'compound' && level === 'intermediate') return { sets: 4, min: 6, max: 10 };
  if (mechanic === 'compound') return { sets: 3, min: 5, max: 8 };
  return { sets: 3, min: 8, max: 12 };
}

const curated = [];
const seen = new Set();

for (const ex of raw) {
  if (['stretching', 'cardio', 'plyometrics'].includes(ex.category)) continue;
  const eq = equipMap[ex.equipment];
  if (!eq || !allowEquip.has(eq)) continue;
  const lname = ex.name.toLowerCase();
  if (lname.includes('stretch') || lname.includes('foam roll')) continue;

  const primary = [
    ...new Set((ex.primaryMuscles || []).map((m) => muscleMap[m]).filter(Boolean)),
  ];
  const secondary = [
    ...new Set((ex.secondaryMuscles || []).map((m) => muscleMap[m]).filter(Boolean)),
  ].filter((m) => !primary.includes(m));
  if (!primary.length) continue;

  const key = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (seen.has(key)) continue;
  seen.add(key);

  const pat = pattern(ex.force, ex.mechanic, ex.name, primary);
  const d = defaults(ex.level, ex.mechanic, pat);
  const notes = (ex.instructions || []).slice(0, 2).join(' ') || null;
  // free-exercise-db ids are strings like "Barbell_Bench_Press" — hash to real UUIDs
  const id = uuidFromKey(String(ex.id));

  curated.push({
    id,
    name: ex.name,
    primary_muscles: primary,
    secondary_muscles: secondary,
    equipment: [eq],
    movement_pattern: pat,
    default_sets: d.sets,
    default_reps_min: d.min,
    default_reps_max: d.max,
    notes,
    source: 'free-exercise-db',
    source_id: ex.id,
    level: ex.level || 'intermediate',
    mechanic: ex.mechanic || 'compound',
    force: ex.force || null,
  });
}

function score(e) {
  let s = 0;
  if (e.mechanic === 'compound') s += 5;
  if (['barbell', 'dumbbell', 'cable'].includes(e.equipment[0])) s += 3;
  if (e.equipment[0] === 'machine') s += 1;
  if (e.level === 'intermediate') s += 2;
  const n = e.name.toLowerCase();
  for (const k of [
    'bench',
    'squat',
    'deadlift',
    'row',
    'press',
    'pull-up',
    'pulldown',
    'curl',
    'extension',
    'raise',
    'lunge',
    'thrust',
    'shrug',
    'fly',
    'dip',
  ]) {
    if (n.includes(k)) s += 2;
  }
  return s;
}

curated.sort((a, b) => score(b) - score(a));
const perMuscle = {};
const final = [];
for (const e of curated) {
  const m = e.primary_muscles[0];
  perMuscle[m] = (perMuscle[m] || 0) + 1;
  if (perMuscle[m] > 16) continue;
  final.push(e);
  if (final.length >= 220) break;
}

const meta = {
  source: 'yuhonas/free-exercise-db',
  license: 'Unlicense (public domain)',
  url: 'https://github.com/yuhonas/free-exercise-db',
  curated_at: new Date().toISOString().slice(0, 10),
  count: final.length,
  note: 'Curated full-gym subset for Grit. Not affiliated with any commercial fitness brand.',
};

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'data/exercises.curated.json'),
  JSON.stringify({ meta, exercises: final }, null, 2)
);

const ts = `/**
 * Auto-curated from ${meta.source} (${meta.license}).
 * ${meta.url}
 * Generated ${meta.curated_at}. Do not edit by hand — re-run scripts/curate-exercises.mjs
 */
import type { Exercise } from './types';

export const EXERCISE_SOURCE_META = ${JSON.stringify(meta, null, 2)} as const;

export const EXERCISES: Exercise[] = ${JSON.stringify(
  final.map((e) => ({
    id: e.id,
    name: e.name,
    primary_muscles: e.primary_muscles,
    secondary_muscles: e.secondary_muscles,
    equipment: e.equipment,
    movement_pattern: e.movement_pattern,
    default_sets: e.default_sets,
    default_reps_min: e.default_reps_min,
    default_reps_max: e.default_reps_max,
    notes: e.notes,
  })),
  null,
  2
)};
`;

fs.writeFileSync(path.join(root, 'src/domain/exercises.generated.ts'), ts);

const seedSql = buildSeedSql(final);
fs.writeFileSync(path.join(root, 'supabase/seed.sql'), seedSql);

console.log('Curated', final.length, 'exercises → data/, src/domain/exercises.generated.ts, supabase/seed.sql');

function sqlStr(value) {
  if (value == null) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlTextArray(values) {
  return `ARRAY[${values.map((v) => `'${v}'`).join(',')}]::text[]`;
}

function buildSeedSql(exercises) {
  const header = `-- Seed catalog for Grit (upsert only — does not delete user plans)
-- Auto-generated by scripts/curate-exercises.mjs on ${meta.curated_at}
-- Exercises: yuhonas/free-exercise-db (Unlicense)
-- IDs are valid deterministic UUIDs (md5 of free-exercise-db string id)
-- https://github.com/yuhonas/free-exercise-db

`;

  const splits = `insert into public.split_templates (id, name, description, days_per_week, is_active) values
  ('ppl', 'Push / Pull / Legs', 'Classic 6-day structure: push, pull, legs — twice per week for high frequency.', 6, true),
  ('upper_lower', 'Upper / Lower', 'Four days alternating upper and lower. Strong balance of frequency and recovery.', 4, true),
  ('bro', 'Bro Split', 'Five body-part days: chest, back, shoulders, arms, legs. High volume per muscle.', 5, true),
  ('full_body', 'Full Body', 'Three full-body sessions. Ideal for HIT, foundations, or busy schedules.', 3, true),
  ('push_pull', 'Push / Pull', 'Four days alternating push (+ quads) and pull (+ hinges). Simple and effective.', 4, true)
on conflict (id) do update set name = excluded.name, description = excluded.description, days_per_week = excluded.days_per_week, is_active = excluded.is_active;

insert into public.split_template_days (id, template_id, day_index, name, focus_muscles) values
  ('ppl-d0', 'ppl', 0, 'Push A', ARRAY['chest','shoulders','triceps']::text[]),
  ('ppl-d1', 'ppl', 1, 'Pull A', ARRAY['back','biceps','traps']::text[]),
  ('ppl-d2', 'ppl', 2, 'Legs A', ARRAY['quads','hamstrings','glutes','calves']::text[]),
  ('ppl-d3', 'ppl', 3, 'Push B', ARRAY['chest','shoulders','triceps']::text[]),
  ('ppl-d4', 'ppl', 4, 'Pull B', ARRAY['back','biceps','forearms']::text[]),
  ('ppl-d5', 'ppl', 5, 'Legs B', ARRAY['quads','hamstrings','glutes','calves']::text[]),
  ('ul-d0', 'upper_lower', 0, 'Upper A', ARRAY['chest','back','shoulders','biceps','triceps']::text[]),
  ('ul-d1', 'upper_lower', 1, 'Lower A', ARRAY['quads','hamstrings','glutes','calves','core']::text[]),
  ('ul-d2', 'upper_lower', 2, 'Upper B', ARRAY['chest','back','shoulders','biceps','triceps']::text[]),
  ('ul-d3', 'upper_lower', 3, 'Lower B', ARRAY['quads','hamstrings','glutes','calves','core']::text[]),
  ('bro-d0', 'bro', 0, 'Chest Day', ARRAY['chest','triceps']::text[]),
  ('bro-d1', 'bro', 1, 'Back Day', ARRAY['back','biceps','traps']::text[]),
  ('bro-d2', 'bro', 2, 'Shoulder Day', ARRAY['shoulders','traps','triceps']::text[]),
  ('bro-d3', 'bro', 3, 'Arm Day', ARRAY['biceps','triceps','forearms']::text[]),
  ('bro-d4', 'bro', 4, 'Leg Day', ARRAY['quads','hamstrings','glutes','calves']::text[]),
  ('fb-d0', 'full_body', 0, 'Full Body A', ARRAY['quads','chest','back','shoulders','core']::text[]),
  ('fb-d1', 'full_body', 1, 'Full Body B', ARRAY['hamstrings','glutes','chest','back','biceps']::text[]),
  ('fb-d2', 'full_body', 2, 'Full Body C', ARRAY['quads','shoulders','back','triceps','core']::text[]),
  ('pp-d0', 'push_pull', 0, 'Push A', ARRAY['chest','shoulders','triceps','quads']::text[]),
  ('pp-d1', 'push_pull', 1, 'Pull A', ARRAY['back','biceps','hamstrings','glutes']::text[]),
  ('pp-d2', 'push_pull', 2, 'Push B', ARRAY['chest','shoulders','triceps','quads']::text[]),
  ('pp-d3', 'push_pull', 3, 'Pull B', ARRAY['back','biceps','hamstrings','calves']::text[])
on conflict (id) do update set template_id = excluded.template_id, day_index = excluded.day_index, name = excluded.name, focus_muscles = excluded.focus_muscles;

`;

  const rows = exercises
    .map(
      (e) =>
        `  ('${e.id}', ${sqlStr(e.name)}, ${sqlTextArray(e.primary_muscles)}, ${sqlTextArray(e.secondary_muscles)}, ${sqlTextArray(e.equipment)}, ${sqlStr(e.movement_pattern)}, ${e.default_sets}, ${e.default_reps_min}, ${e.default_reps_max}, ${sqlStr(e.notes)})`
    )
    .join(',\n');

  const exercisesSql = `insert into public.exercises (id, name, primary_muscles, secondary_muscles, equipment, movement_pattern, default_sets, default_reps_min, default_reps_max, notes) values
${rows}
on conflict (id) do update set name = excluded.name, primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, movement_pattern = excluded.movement_pattern, default_sets = excluded.default_sets, default_reps_min = excluded.default_reps_min, default_reps_max = excluded.default_reps_max, notes = excluded.notes;
`;

  return header + splits + '\n' + exercisesSql;
}
