import test from 'node:test';
import assert from 'node:assert/strict';
import { mineChallenge, defaultWorkerCount } from '../src/miner.js';
import { verifySolution } from '../src/pow.js';

test('defaultWorkerCount returns a safe positive worker count', () => {
  const workers = defaultWorkerCount();
  assert.equal(Number.isInteger(workers), true);
  assert.ok(workers >= 1);
  assert.ok(workers <= 8);
});

test('mineChallenge parallel workers find a valid low-difficulty solution', async () => {
  const result = await mineChallenge({
    noncePrefixHex: '00ff',
    difficultyBits: 4,
    workers: 2,
    progressEveryMs: 100,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  assert.equal(result.workers, 2);
  assert.equal(verifySolution('00ff', result.nonce, 4), true);
});
