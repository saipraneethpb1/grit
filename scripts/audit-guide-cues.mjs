import { readFileSync, writeFileSync } from 'node:fs';
import { conciseGuideSteps } from '../src/domain/guideText.ts';

// Offline editorial audit only: credentials never enter the Expo application.
async function main() {
const key = process.env.TYPESAFE_API_KEY;
if (!key) throw new Error('Set TYPESAFE_API_KEY in the audit process environment.');
const guides = JSON.parse(readFileSync('data/exercise-guides.json', 'utf8'));
const overrides = JSON.parse(readFileSync('data/exercise-step-overrides.json', 'utf8'));
const state = Object.values(guides).filter((g) => overrides[g.sourceId]).map((g) => ({
  sourceId: g.sourceId,
  source: g.instructions,
  displayed: conciseGuideSteps(g.instructions, g.sourceId),
}));
const questions = Object.fromEntries(state.flatMap((g, index) => [
  [`contradiction_${index}`, {
    type: 'noul',
    instructions: `Does any cue in state[${index}].displayed contradict the corresponding exercise's state[${index}].source or introduce an unsupported movement, equipment, grip, or body position? Evaluate the whole sequences, not sentence index alignment. Shortening and reordering are allowed. Judge source fidelity, not medical validity.`,
  }],
  [`omission_${index}`, {
    type: 'noul',
    instructions: `Does state[${index}].displayed omit an explicit setup or control detail in state[${index}].source needed to understand how to perform this specific exercise? Ignore breathing, repetition count, minor timing, and muscle-feel cues. Evaluate the entire displayed sequence because later unchanged steps may retain details. Judge source fidelity, not medical validity.`,
  }],
]));
const response = await fetch('https://api.typesafe.ai/v1/systemone', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'jev-latest', state, questions }),
  signal: AbortSignal.timeout(120_000),
});
if (!response.ok) throw new Error(`TypeSafe audit failed: HTTP ${response.status}`);
const result = await response.json();
for (const id of Object.keys(questions)) {
  const answer = result.answers?.[id];
  if (answer?.type !== 'noul' || typeof answer.noul !== 'number' || !Number.isFinite(answer.noul) || answer.noul < 0 || answer.noul > 1) {
    throw new Error(`Invalid audit answer: ${id}`);
  }
}
const report = {
  model: result.model, usage: result.usage,
  note: 'Model flags require human review. Probabilities are not clinical safety ratings.',
  guides: state.map((guide, index) => ({ ...guide,
    contradiction: result.answers[`contradiction_${index}`].noul,
    omission: result.answers[`omission_${index}`].noul,
  })),
};
const output = process.argv[2] ?? '/tmp/grit-guide-audit.json';
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ model: report.model, usage: report.usage, reviewed: state.length, output,
  flags: report.guides.filter(g => g.contradiction >= 0.5 || g.omission >= 0.5).map(g => ({ sourceId: g.sourceId, contradiction: g.contradiction, omission: g.omission })),
}, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
