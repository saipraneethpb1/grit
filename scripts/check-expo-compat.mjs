// Checks that installed Expo-managed packages match the ranges bundled with the
// *installed* Expo SDK (expo/bundledNativeModules.json).
//
// `expo install --check` asks Expo's version service instead, so CI failed
// every time Expo published a new patch even though nothing in this
// repository changed. This check only fails when the repository itself is
// misaligned: bump `expo`, run `npx expo install --fix`, and it passes again.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
const require = createRequire(new URL('package.json', root));
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const bundled = require('expo/bundledNativeModules.json');

function parse(version) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
  assert.ok(m, `Unparseable version: ${version}`);
  return m.slice(1, 4).map(Number);
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Enough of semver for Expo's ranges: `~x.y.z`, `^x.y.z`, or an exact pin. */
export function satisfies(version, range) {
  const v = parse(version);
  const op = range[0];
  if (op !== '~' && op !== '^') return compare(v, parse(range)) === 0;
  const min = parse(range.slice(1));
  let max;
  if (op === '~') max = [min[0], min[1] + 1, 0];
  else if (min[0] > 0) max = [min[0] + 1, 0, 0];
  else if (min[1] > 0) max = [0, min[1] + 1, 0];
  else max = [0, 0, min[2] + 1];
  return compare(v, min) >= 0 && compare(v, max) < 0;
}

// The matcher itself, so a regression here cannot silently pass everything.
assert.ok(satisfies('57.0.29', '~57.0.27'));
assert.ok(!satisfies('57.0.26', '~57.0.27'));
assert.ok(!satisfies('57.1.0', '~57.0.27'));
assert.ok(satisfies('15.2.0', '^15.0.2') && !satisfies('16.0.0', '^15.0.2'));
assert.ok(satisfies('0.21.4', '^0.21.0') && !satisfies('0.22.0', '^0.21.0'));
assert.ok(satisfies('0.86.3', '0.86.3') && !satisfies('0.86.4', '0.86.3'));

const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
const managed = declared.filter((name) => name in bundled);
const problems = [];
for (const name of managed) {
  const installed = require(`${name}/package.json`).version;
  if (!satisfies(installed, bundled[name])) {
    problems.push(`${name}@${installed} is outside the SDK's range ${bundled[name]}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('\nRun `npx expo install --fix` to realign with the installed Expo SDK.');
  process.exit(1);
}

const expo = require('expo/package.json').version;
console.log(`PASS: ${managed.length} Expo-managed packages match the ranges bundled with expo@${expo}`);
