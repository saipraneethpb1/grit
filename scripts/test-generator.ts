import { EXERCISES, SPLIT_TEMPLATES, getSplitDays } from '../src/domain/catalog';
import { METHODOLOGIES } from '../src/domain/methodologies';
import { generatePlan, validateGeneratedPlan } from '../src/domain/planGenerator';
import { analyzeTrainingPlan } from '../src/domain/trainingAnalysis';

let failed = 0;

for (const template of SPLIT_TEMPLATES) {
  const plan = generatePlan(template.id, EXERCISES);
  const errors = validateGeneratedPlan(plan);
  const audit = analyzeTrainingPlan(plan);

  if (audit.missingDirectCoverage.length) {
    errors.push(`Missing weekly direct coverage: ${audit.missingDirectCoverage.join(', ')}`);
  }

  if (plan.days.length !== template.days_per_week) {
    errors.push(
      `Expected ${template.days_per_week} days, got ${plan.days.length}`
    );
  }

  if (errors.length) {
    failed += 1;
    console.error(`FAIL ${template.id}:`, errors);
  } else {
    const totalEx = plan.days.reduce((n, d) => n + d.exercises.length, 0);
    console.log(
      `OK   ${template.id.padEnd(14)} ${plan.days.length} days, ${totalEx} exercises total`
    );
  }
}

// A curated shortlist is matched by exact name, so a rename in the catalog
// (re-running curate-exercises.mjs) would silently drop it back to keyword
// scoring. Fail loudly instead.
{
  const catalogNames = new Set(EXERCISES.map((e) => e.name.toLowerCase()));
  for (const m of METHODOLOGIES) {
    const missing = (m.preferredExerciseNames ?? []).filter(
      (name) => !catalogNames.has(name.toLowerCase())
    );
    if (missing.length) {
      failed += 1;
      console.error(`FAIL ${m.id} preferredExerciseNames not in catalog:`, missing);
    } else if (m.preferredExerciseNames?.length) {
      console.log(
        `OK   ${m.id.padEnd(20)} ${m.preferredExerciseNames.length} shortlisted lifts all resolve`
      );
    }
  }
}

// Session length tracks focus-muscle count almost exactly, so a split whose
// days declare different numbers of muscles produces a lopsided week — bro
// used to put a 43-minute chest day next to an 86-minute leg day. Lock the
// parity in at the template level.
console.log('\nPer-day parity:');
for (const template of SPLIT_TEMPLATES) {
  const counts = getSplitDays(template.id).map((d) => d.focus_muscles.length);
  if (new Set(counts).size > 1) {
    failed += 1;
    console.error(`FAIL ${template.id} days declare uneven focus counts: [${counts}]`);
  } else {
    console.log(`OK   ${template.id.padEnd(20)} every day declares ${counts[0]} focus muscles`);
  }
}

// Parity has to survive generation too: every methodology cap must land the
// same number of movements on every day, and no day may run far longer than
// its neighbours.
const MAX_MINUTE_SPREAD = 15;
for (const template of SPLIT_TEMPLATES) {
  for (const m of [undefined, ...METHODOLOGIES]) {
    const plan = generatePlan({
      templateId: template.id,
      exercises: EXERCISES,
      methodologyId: m?.id,
    });
    const audit = analyzeTrainingPlan(plan);
    const counts = plan.days.map((d) => d.exercises.length);
    const minutes = audit.days.map((d) => d.estimatedMinutes);
    const spread = Math.max(...minutes) - Math.min(...minutes);
    const label = `${template.id}/${m?.id ?? 'no methodology'}`;
    if (new Set(counts).size > 1) {
      failed += 1;
      console.error(`FAIL ${label} uneven exercises per day: [${counts}]`);
    } else if (spread > MAX_MINUTE_SPREAD) {
      failed += 1;
      console.error(`FAIL ${label} session length spread ${spread} min: [${minutes}]`);
    }
  }
}
console.log(
  `OK   all ${SPLIT_TEMPLATES.length} splits × ${METHODOLOGIES.length + 1} biases generate even days (≤${MAX_MINUTE_SPREAD} min spread)`
);

console.log('\nMethodologies × default splits:');
for (const m of METHODOLOGIES) {
  const plan = generatePlan({
    templateId: m.defaultSplitId,
    exercises: EXERCISES,
    methodologyId: m.id,
  });
  const errors = validateGeneratedPlan(plan);
  const audit = analyzeTrainingPlan(plan);
  if (audit.missingDirectCoverage.length) {
    errors.push(`Missing weekly direct coverage: ${audit.missingDirectCoverage.join(', ')}`);
  }
  if (errors.length) {
    failed += 1;
    console.error(`FAIL method ${m.id}:`, errors);
  } else {
    const totalEx = plan.days.reduce((n, d) => n + d.exercises.length, 0);
    console.log(`OK   ${m.id.padEnd(20)} → ${m.defaultSplitId} (${totalEx} exercises)`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\nAll ${SPLIT_TEMPLATES.length} splits + ${METHODOLOGIES.length} methodologies OK.`);
console.log(`Exercise library size: ${EXERCISES.length}`);
