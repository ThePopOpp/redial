import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseline = JSON.parse(await readFile('docs/evidence/kit-baseline.json', 'utf8'));
const current = await readdir('redial-build-kit', { recursive: true, withFileTypes: true });
assert.equal(current.filter(entry => entry.isFile()).length, baseline.length, 'Kit file count changed');
for (const file of baseline) {
  const contents = await readFile(file.path);
  assert.equal(createHash('sha256').update(contents).digest('hex'), file.sha256, file.path);
}
console.log(`All ${baseline.length} original kit files match the M0 SHA-256 baseline.`);
