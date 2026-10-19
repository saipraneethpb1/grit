import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXERCISES } from '../src/domain/exercises.generated';
import { anatomicalCell, anatomicalSequence, getExerciseAnatomy } from '../src/domain/exerciseAnatomy';
import { getExerciseDemonstration } from '../src/domain/exerciseDemonstration';
const atlas = JSON.parse(readFileSync(new URL('../data/exercise-anatomy.json', import.meta.url)));
const guides = JSON.parse(readFileSync(new URL('../data/exercise-guides.json', import.meta.url)));

/** Width and height from a WebP header (VP8, VP8L or VP8X), so the test needs no decoder. */
function webpSize(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  assert.equal(chunk, 'VP8 ');
  return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
}
const root = new URL('../', import.meta.url);
const manifest = readFileSync(new URL('src/domain/exerciseAnatomyAssets.ts', root), 'utf8');
const entries = atlas;
assert.equal(Object.keys(entries).length, EXERCISES.length);
let reviewed = 0;
async function main() {
for (const exercise of EXERCISES) {
  const entry = entries[exercise.id];
  const guide = guides[exercise.id];
  assert.equal(entry.sourceId, guide.sourceId, `${exercise.name}: exact source identity`);
  assert.deepEqual(entry.instructions, guide.instructions, `${exercise.name}: instructions agree with artwork specification`);
  assert.equal(entry.frames, entry.columns * entry.rows);
  const sequence = anatomicalSequence(entry);
  assert.ok(sequence.length > 0);
  assert.ok(sequence.every(frame => Number.isInteger(frame) && frame >= 0 && frame < entry.frames));
  if (entry.phaseLabels) assert.equal(entry.phaseLabels.length, sequence.length);
  if (entry.status !== 'reviewed') {
    assert.equal(getExerciseAnatomy(exercise.id), undefined, `${exercise.name}: unreviewed artwork cannot display`);
    continue;
  }
  reviewed++;
  assert.ok(getExerciseAnatomy(exercise.id));
  for (const suffix of ['', '-thumb']) {
    const imagePath = `assets/anatomy/${exercise.id}${suffix}.webp`;
    assert.ok(manifest.includes(`require('../../${imagePath}')`), `${exercise.name}: offline ${suffix || 'full'} asset`);
    const image = webpSize(readFileSync(new URL(imagePath, root)));
    assert.equal(image.width, image.height, `${exercise.name}: square sheet preserves frame cropping`);
    assert.equal(image.width % entry.columns, 0);
    if (suffix) assert.equal(image.width, 256, `${exercise.name}: thumbnail avoids decoding the full sheet in lists`);
  }
}
assert.equal(getExerciseAnatomy('unknown-exercise'), undefined);
// Sheets rejected in review show the rig until redrawn; nothing else may drop out of coverage.
const awaitingRedraw = [];
assert.deepEqual(EXERCISES.filter(exercise => entries[exercise.id].status !== 'reviewed').map(exercise => exercise.name).sort(),
  [...awaitingRedraw].sort(),'Only the listed sheets may await a redraw');
assert.equal(reviewed, EXERCISES.length - awaitingRedraw.length);
assert.deepEqual(anatomicalSequence(entries['a418216e-1d42-4ce3-abfe-e4c36ef1d452']), [0, 1, 0, 2, 3], 'Press returns to lockout before skull crusher');
assert.deepEqual(anatomicalSequence(entries['6ffa90f0-b3cc-4186-aa5f-959418009ae4']), [0, 1, 2, 1, 3], 'Cuban press lowers before rotating down');
assert.deepEqual(anatomicalSequence(entries['474ebafc-40e9-46de-a5c2-f4fb730ec64c']), [0, 1, 2, 1, 3], 'Pallof rotation returns to extended neutral before bringing hands to chest');
// Sheets whose drawn order starts mid-rep must play from the true starting position.
const byName = name => Object.keys(entries).find(id => entries[id].name === name);
assert.deepEqual(anatomicalSequence(entries[byName('V-Bar Pulldown')]), [2, 0], 'V-bar pulldown starts with arms extended');
assert.deepEqual(anatomicalSequence(entries[byName('Wide-Grip Pulldown Behind The Neck')]), [3, 0], 'Behind-neck pulldown starts with arms extended');
assert.deepEqual(anatomicalSequence(entries[byName('Stiff-Legged Barbell Deadlift')]), [2, 0], 'Stiff-legged deadlift starts standing');
assert.deepEqual(anatomicalSequence(entries[byName('Standing Palms-In Dumbbell Press')]), [2, 0], 'Palms-in press starts at the shoulders');
assert.deepEqual(anatomicalSequence(entries[byName('Bent-Arm Barbell Pullover')]), [2, 0], 'Pullover starts with the bar over the chest');
// Simple movements show only their start and end positions; multi-phase, alternating and
// two-direction movements keep every authored pose so no phase goes missing.
const fullSequences = new Set([
  'Clean and Press', 'Cuban Press', 'Decline Close-Grip Bench To Skull Crusher', 'Pallof Press With Rotation',
  'Zottman Curl', 'Zottman Preacher Curl', 'Clean', 'Power Clean', 'Kneeling Jump Squat',
  'Alternate Incline Dumbbell Curl', 'Alternate Hammer Curl', 'Alternating Cable Shoulder Press',
  'See-Saw Press (Alternating Side Press)', 'Flutter Kicks', 'Monster Walk', 'Rocking Standing Calf Raise',
]);
for (const exercise of EXERCISES) {
  const sequence = anatomicalSequence(entries[exercise.id]);
  if (fullSequences.has(exercise.name)) {
    assert.ok(sequence.length >= 4, `${exercise.name}: keeps every phase`);
  } else {
    assert.equal(sequence.length, 2, `${exercise.name}: start and end positions only`);
    assert.notEqual(sequence[0], sequence[1], `${exercise.name}: start and end differ`);
    assert.equal(entries[exercise.id].phaseLabels?.length, 2, `${exercise.name}: labelled start and end`);
  }
}
assert.deepEqual(anatomicalSequence(entries[byName('Close-Grip Barbell Bench Press')]), [2, 0], 'Bench press starts at lockout');
assert.deepEqual(anatomicalSequence(entries[byName('Jerk Dip Squat')]), [0, 1], 'Jerk dip ends in the dip');
// Every displayed sheet keeps the exact rig as a fallback for missing artwork.
for (const exercise of EXERCISES) {
  const demo = getExerciseDemonstration(exercise.id);
  if (demo.kind === 'anatomical') assert.ok(demo.motion, `${exercise.name}: rig fallback behind the artwork`);
}
assert.deepEqual([0, 1, 2, 3].map(frame => anatomicalCell(frame, 2)), [
  { column: 0, row: 0 }, { column: 1, row: 0 }, { column: 0, row: 1 }, { column: 1, row: 1 },
]);
console.log(`PASS: ${EXERCISES.length} exact anatomy specifications; ${reviewed} reviewed offline sheets; unreviewed drawings gated; four distinct frame crops.`);
}
main().catch(error => { console.error(error); process.exit(1); });
