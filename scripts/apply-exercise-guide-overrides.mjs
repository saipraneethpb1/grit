// Apply guidance corrections to the locked catalog without reselecting exercises or rewriting split seeds.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const write = (name, text) => fs.writeFileSync(new URL(name, root), text);
const overrides = JSON.parse(read('data/exercise-guide-overrides.json'));
const catalog = JSON.parse(read('data/exercises.curated.json'));
const guides = JSON.parse(read('data/exercise-guides.json'));
const anatomyFile = new URL('data/exercise-anatomy.json', root);
const anatomy = fs.existsSync(anatomyFile) ? JSON.parse(read('data/exercise-anatomy.json')) : null;
let generated = read('src/domain/exercises.generated.ts');
let seed = read('supabase/seed.sql');
const marker = 'export const EXERCISES: Exercise[] = ';
const start = generated.indexOf(marker) + marker.length;
const end = generated.lastIndexOf(';');
if (start < marker.length || end < start) throw Error('Catalog export not found');
const exercises = JSON.parse(generated.slice(start, end));
const sql = value => "'" + value.replaceAll("'", "''") + "'";
for (const exercise of catalog.exercises) {
  const override = overrides[exercise.source_id];
  if (!override) continue;
  const notes = override.instructions.slice(0, 2).join(' ');
  if (notes !== exercise.notes) {
    const rows = seed.split('\n');
    const row = rows.findIndex(line => line.startsWith(`  ('${exercise.id}',`));
    const old = `, ${sql(exercise.notes)})`;
    if (row < 0 || !rows[row].includes(old)) throw Error(`Seed guidance drift: ${exercise.name}`);
    rows[row] = rows[row].replace(old, `, ${sql(notes)})`);
    seed = rows.join('\n');
  }
  exercise.notes = notes;
  const target = exercises.find(entry => entry.id === exercise.id);
  if (!target || guides[exercise.id]?.sourceId !== exercise.source_id || (anatomy && anatomy[exercise.id]?.sourceId !== exercise.source_id)) {
    throw Error(`Guidance identity drift: ${exercise.name}`);
  }
  target.notes = notes;
  guides[exercise.id].instructions = override.instructions;
  if (anatomy) anatomy[exercise.id].instructions = override.instructions;
}
generated = generated.slice(0, start) + JSON.stringify(exercises, null, 2) + generated.slice(end);
write('data/exercises.curated.json', JSON.stringify(catalog, null, 2));
write('data/exercise-guides.json', JSON.stringify(guides, null, 2) + '\n');
if (anatomy) write('data/exercise-anatomy.json', JSON.stringify(anatomy, null, 2) + '\n');
write('src/domain/exercises.generated.ts', generated);
write('supabase/seed.sql', seed);
console.log('Guidance corrections synchronized without changing catalog selection or split seeds.');
