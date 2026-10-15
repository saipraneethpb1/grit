import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(new URL('../package.json', import.meta.url));
const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const bundled = require('expo/bundledNativeModules.json');

function parts(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `Unparseable version: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function satisfies(version, range) {
  const installed = parts(version);
  if (range.startsWith('~')) {
    const minimum = parts(range.slice(1));
    const exclusive = [minimum[0], minimum[1] + 1, 0];
    return compare(installed, minimum) >= 0 && compare(installed, exclusive) < 0;
  }
  if (range.startsWith('^')) {
    const minimum = parts(range.slice(1));
    const exclusive = minimum[0] > 0
      ? [minimum[0] + 1, 0, 0]
      : minimum[1] > 0
        ? [0, minimum[1] + 1, 0]
        : [0, 0, minimum[2] + 1];
    return compare(installed, minimum) >= 0 && compare(installed, exclusive) < 0;
  }
  return compare(installed, parts(range)) === 0;
}

assert.equal(satisfies('57.0.29', '~57.0.29'), true);
assert.equal(satisfies('57.0.22', '~57.0.29'), false);
assert.equal(satisfies('57.1.0', '~57.0.29'), false);
assert.equal(satisfies('15.1.1', '^15.0.2'), true);
assert.equal(satisfies('16.0.0', '^15.0.2'), false);
assert.equal(satisfies('0.20.14', '^0.20.14'), true);
assert.equal(satisfies('0.21.0', '^0.20.14'), false);
assert.equal(satisfies('0.86.3', '0.86.3'), true);

const declared = { ...pkg.dependencies, ...pkg.devDependencies };
const problems = [];
for (const name of Object.keys(declared)) {
  if (!(name in bundled)) continue;
  const installed = require(`${name}/package.json`).version;
  const expected = bundled[name];
  if (!satisfies(installed, expected)) {
    problems.push(`${name}@${installed} does not satisfy the locked Expo SDK range ${expected}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`PASS: ${Object.keys(declared).filter(name => name in bundled).length} installed packages match the locked Expo SDK.`);
