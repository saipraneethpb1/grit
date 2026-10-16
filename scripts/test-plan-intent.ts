import {
  buildPlanIntentQuestions,
  buildPlanIntentRequest,
  EQUIPMENT_OPTIONS,
  STYLE_OPTIONS,
  type PlanIntentAnswers,
} from '../supabase/functions/_shared/planIntentQuestions';
import { EXERCISES, SPLIT_TEMPLATES } from '../src/domain/catalog';
import { METHODOLOGIES } from '../src/domain/methodologies';
import { generatePlan } from '../src/domain/planGenerator';
import {
  DAY_CHOICES,
  encodeEquipmentParam,
  filterCatalogForEquipment,
  interpretPlanIntent,
  parseEquipmentParam,
  pickSplitFor,
} from '../src/domain/planIntent';
import { analyzeTrainingPlan } from '../src/domain/trainingAnalysis';
import type { Equipment } from '../src/domain/types';

let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Answers shaped like TypeSafe's, with every "stated" Noul defaulting to no. */
function answers(overrides: PlanIntentAnswers = {}): PlanIntentAnswers {
  const base: PlanIntentAnswers = {
    style: { type: 'choice', choice: 'practical_gym', confidence: 0.9 },
    style_stated: { type: 'noul', noul: 0.05 },
    days: { type: 'choice', choice: 'days_4', confidence: 0.9 },
    days_stated: { type: 'noul', noul: 0.05 },
    equipment_stated: { type: 'noul', noul: 0.05 },
  };
  for (const id of Object.keys(EQUIPMENT_OPTIONS)) base[`has_${id}`] = { type: 'noul', noul: 0.9 };
  return { ...base, ...overrides };
}

// --- the question catalog cannot drift from the app ---
{
  assert(
    sameSet(Object.keys(STYLE_OPTIONS), METHODOLOGIES.map((m) => m.id)),
    'every training style is offered to the model, and nothing else'
  );
  const catalogEquipment = new Set(EXERCISES.flatMap((e) => e.equipment));
  const asked = new Set<string>(['bodyweight', ...Object.keys(EQUIPMENT_OPTIONS)]);
  assert(
    [...catalogEquipment].every((e) => asked.has(e)),
    'every equipment type in the catalog has a question (or is bodyweight)'
  );
  const questions = buildPlanIntentQuestions();
  assert(
    Object.values(questions).every((q) => q.instructions.includes('`description`')),
    'every question names the state it reads'
  );
  assert(Object.keys(questions).length === 5 + Object.keys(EQUIPMENT_OPTIONS).length, 'one request carries every question');
  const req = buildPlanIntentRequest('4 days');
  assert(req.model === 'jev-latest' && req.state.description === '4 days', 'request wraps the description as named state');
}

// --- defaults when nothing is mentioned ---
{
  const intent = interpretPlanIntent(answers());
  assert(intent.methodologyId === 'beginner_basics', 'unmentioned style falls back to the beginner quick start');
  assert(intent.daysPerWeek === 3, 'unmentioned days follow the style default (3)');
  assert(intent.equipment.length === 1 + Object.keys(EQUIPMENT_OPTIONS).length, 'unmentioned equipment means a full gym');
  assert(intent.uncertain.length === 0, 'confident "not mentioned" answers are not flagged');
  assert(!intent.stated.style && !intent.stated.days && !intent.stated.equipment, 'nothing is reported as stated');
}

// --- a clear description is taken at its word ---
{
  const intent = interpretPlanIntent(
    answers({
      style_stated: { type: 'noul', noul: 0.95 },
      style: { type: 'choice', choice: 'joint_smart', confidence: 0.8 },
      days_stated: { type: 'noul', noul: 0.97 },
      days: { type: 'choice', choice: 'days_4', confidence: 0.85 },
      equipment_stated: { type: 'noul', noul: 0.92 },
      has_barbell: { type: 'noul', noul: 0.04 },
      has_dumbbell: { type: 'noul', noul: 0.96 },
      has_cable: { type: 'noul', noul: 0.03 },
      has_machine: { type: 'noul', noul: 0.02 },
      has_kettlebell: { type: 'noul', noul: 0.1 },
      has_band: { type: 'noul', noul: 0.12 },
    })
  );
  assert(intent.methodologyId === 'joint_smart', 'stated style is used');
  assert(intent.daysPerWeek === 4, 'stated days are used (4)');
  assert(sameSet(intent.equipment, ['bodyweight', 'dumbbell']), 'home dumbbells means bodyweight + dumbbells');
  assert(intent.uncertain.length === 0, 'nothing flagged when every answer is clear');
}

// --- uncertainty is surfaced, not hidden ---
{
  const lowStyle = interpretPlanIntent(
    answers({
      style_stated: { type: 'noul', noul: 0.9 },
      style: { type: 'choice', choice: 'aesthetic', confidence: 0.2 },
    })
  );
  assert(lowStyle.methodologyId === 'aesthetic' && lowStyle.uncertain.includes('style'), 'a low-confidence style is kept but flagged');

  const coinFlip = interpretPlanIntent(answers({ days_stated: { type: 'noul', noul: 0.5 } }));
  assert(coinFlip.uncertain.includes('days'), 'a coin-flip "did they say days" is flagged');

  const bandUnsure = interpretPlanIntent(
    answers({ equipment_stated: { type: 'noul', noul: 0.9 }, has_band: { type: 'noul', noul: 0.55 } })
  );
  assert(
    bandUnsure.uncertainEquipment.includes('band') && bandUnsure.uncertain.includes('equipment'),
    'a coin-flip equipment item is flagged by name'
  );

  const bogus = interpretPlanIntent(
    answers({ style_stated: { type: 'noul', noul: 0.9 }, style: { type: 'choice', choice: 'not_a_style', confidence: 0.99 } })
  );
  assert(bogus.methodologyId === 'beginner_basics' && bogus.uncertain.includes('style'), 'an unknown option falls back and is flagged');

  const empty = interpretPlanIntent({});
  assert(empty.methodologyId === 'beginner_basics' && empty.uncertain.length === 3, 'missing answers flag every field');
}

// --- every style has a split for every day count ---
{
  let ok = true;
  for (const m of METHODOLOGIES) {
    for (const days of DAY_CHOICES) {
      const split = SPLIT_TEMPLATES.find((s) => s.id === pickSplitFor(m, days));
      if (!split || split.days_per_week !== days) {
        ok = false;
        console.error(`     ${m.id} × ${days} days -> ${split?.id}`);
      }
    }
  }
  assert(ok, 'every style × day count lands on a split with that many days');
  const bb = METHODOLOGIES.find((m) => m.id === 'beginner_basics')!;
  assert(pickSplitFor(bb, 3) === 'beginner_full_body', "a style's own preference wins among equal day counts");
}

// --- equipment limits never cost a focus muscle ---
{
  const kits: Equipment[][] = [
    ['bodyweight'],
    ['bodyweight', 'dumbbell'],
    ['bodyweight', 'band', 'kettlebell'],
    ['bodyweight', 'barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'band'],
  ];
  let covered = true;
  let respected = true;
  for (const kit of kits) {
    for (const split of SPLIT_TEMPLATES.filter((s) => s.is_active)) {
      for (const m of METHODOLOGIES) {
        const { exercises, fallbackMuscles } = filterCatalogForEquipment(EXERCISES, kit, split.id);
        const plan = generatePlan({ templateId: split.id, exercises, methodologyId: m.id });
        if (analyzeTrainingPlan(plan).missingDirectCoverage.length) {
          covered = false;
          console.error(`     ${kit.join('+')} ${split.id} ${m.id}: missing coverage`);
        }
        for (const day of plan.days) {
          for (const ex of day.exercises) {
            const inKit = ex.exercise.equipment.every((e) => kit.includes(e));
            const isFallback = ex.exercise.primary_muscles.some((mm) => fallbackMuscles.includes(mm));
            if (!inKit && !isFallback) respected = false;
          }
        }
      }
    }
  }
  assert(covered, 'every kit × split × style still trains every focus muscle directly');
  assert(respected, 'out-of-kit movements appear only for muscles the kit cannot train');

  const dumbbells = filterCatalogForEquipment(EXERCISES, ['bodyweight', 'dumbbell'], 'ppl');
  assert(dumbbells.fallbackMuscles.length === 0, 'dumbbells + bodyweight need no fallback on push/pull/legs');
  const bare = filterCatalogForEquipment(EXERCISES, ['bodyweight'], 'full_body');
  assert(bare.fallbackMuscles.length > 0, 'bodyweight alone reports the muscles it cannot cover');
}

// --- the route param round-trips ---
{
  const kit: Equipment[] = ['bodyweight', 'dumbbell', 'band'];
  assert(sameSet(parseEquipmentParam(encodeEquipmentParam(kit))!, kit), 'equipment survives the route param');
  assert(parseEquipmentParam(undefined) === null, 'no param means no filter');
  assert(sameSet(parseEquipmentParam('dumbbell,<script>')!, ['bodyweight', 'dumbbell']), 'unknown values are dropped and bodyweight is restored');
}

if (failed > 0) {
  console.error(`\n${failed} plan-intent test(s) failed`);
  process.exit(1);
}
console.log('\nAll plan-intent tests passed');
