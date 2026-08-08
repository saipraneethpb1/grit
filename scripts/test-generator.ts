import { EXERCISES, SPLIT_TEMPLATES } from '../src/domain/catalog';
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
