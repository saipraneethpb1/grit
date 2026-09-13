import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const curated = JSON.parse(readFileSync(new URL('data/exercises.curated.json', root))).exercises;
const guides = JSON.parse(readFileSync(new URL('data/exercise-guides.json', root)));
const manifest = readFileSync(new URL('src/domain/exerciseGuideImages.ts', root), 'utf8');
assert.equal(Object.keys(guides).length, curated.length);
for (const exercise of curated) {
  const guide = guides[exercise.id];
  assert.ok(guide, `Missing guide: ${exercise.name}`);
  assert.equal(guide.sourceId, exercise.source_id, `Incorrect demonstration mapping: ${exercise.name}`);
  assert.ok(guide.instructions.length >= 1);
  assert.ok(guide.instructions.every(step => typeof step === 'string' && step.trim().length > 0));
  for (let frame = 0; frame < 2; frame++) {
    const path = `assets/exercises/${exercise.id}-${frame}.jpg`;
    assert.ok(manifest.includes(`require('../../${path}')`), `Missing Metro asset: ${path}`);
    const bytes = readFileSync(new URL(path, root));
    assert.equal(bytes.readUInt16BE(0), 0xffd8, `Invalid JPEG: ${path}`);
    assert.ok(bytes.length > 1000, `Empty demonstration: ${path}`);
  }
}
console.log(`PASS: ${curated.length} exact source mappings, complete instructions, and ${curated.length * 2} bundled JPEG frames.`);
