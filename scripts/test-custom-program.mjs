import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildCustomProgram, moveItem } from '../src/domain/customProgram.ts';
import { EXERCISES } from '../src/domain/catalog.ts';
import { cleanGuideText, conciseGuideSteps } from '../src/domain/guideText.ts';
const draft = { name: ' My routine ', days: [{ name: ' Push ', exercises: [{ exerciseId: EXERCISES[0].id, sets: '3', minReps: '8', maxReps: '12' }] }] };
const plan = buildCustomProgram(draft);
assert.equal(plan.name, 'My routine');
assert.equal(plan.template_id, 'custom');
assert.equal(plan.days[0].name, 'Push');
assert.equal(plan.days[0].day_index, 0);
assert.equal(plan.days[0].exercises[0].target_sets, 3);
assert.deepEqual(plan.days[0].focus_muscles, EXERCISES[0].primary_muscles);
for (const mutate of [
  (d) => { d.name = ' '; },
  (d) => { d.days = []; },
  (d) => { d.days[0].exercises = []; },
  (d) => { d.days[0].exercises[0].sets = '1.5'; },
  (d) => { d.days[0].exercises[0].sets = '31'; },
  (d) => { d.days[0].exercises[0].minReps = '13'; },
  (d) => { d.days[0].exercises[0].exerciseId = 'unknown'; },
]) { const invalid = structuredClone(draft); mutate(invalid); assert.throws(() => buildCustomProgram(invalid)); }
assert.deepEqual(moveItem(['A', 'B', 'C'], 1, -1), ['B', 'A', 'C']);
assert.deepEqual(moveItem(['A'], 0, -1), ['A']);
assert.equal(cleanGuideText(' Hold. Tip:Keep   steady &amp; breathe . '), 'Hold. Tip: Keep steady & breathe.');
assert.deepEqual(conciseGuideSteps(['Lift slowly. This is your starting position.', 'Repeat for the recommended number of repetitions.']), ['Lift slowly.', 'Repeat for your target reps.']);
assert.equal(draft.name, ' My routine ');
console.log('PASS: custom plan validation, ordering, target conversion, source text cleanup, and concise instructions');

const guides = JSON.parse(readFileSync(new URL('../data/exercise-guides.json', import.meta.url)));
for (const guide of Object.values(guides)) {
  const steps = conciseGuideSteps(guide.instructions, guide.sourceId);
  assert.equal(steps.length, guide.instructions.length);
  assert.ok(steps.slice(0, 3).every(step => step.split(/\s+/).length <= 32), guide.sourceId);
}
console.log('PASS: all 189 guides preserve full step counts and keep starting cues within 32 words');

// Setup and control details TYPESAFE_AUDIT.md found missing from the short
// cues. Checked against the three steps the inline card shows, since that is
// all a user sees without opening the full instructions.
const requiredCues = {
  Barbell_Ab_Rollout: [/abs tight/, /arch in your back/, /perpendicular to the floor/],
  Seated_Barbell_Military_Press: [/wider than shoulder width/, /in front of your head/],
  Bent_Over_Barbell_Row: [/almost parallel to the floor/, /elbows close/],
  Bench_Dips: [/shoulder-width/, /legs forward/, /elbows close/],
};
for (const [sourceId, patterns] of Object.entries(requiredCues)) {
  const guide = Object.values(guides).find(g => g.sourceId === sourceId);
  assert.ok(guide, `Missing guide: ${sourceId}`);
  const inline = conciseGuideSteps(guide.instructions, sourceId).slice(0, 3).join(' ');
  for (const pattern of patterns) assert.match(inline, pattern, `${sourceId} inline cues lost ${pattern}`);
}
console.log(`PASS: ${Object.keys(requiredCues).length} audited guides keep their source setup and control cues inline`);
