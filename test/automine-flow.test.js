import test from 'node:test';
import assert from 'node:assert/strict';
import { runAutomine } from '../src/automine.js';

test('runAutomine verifies active session with /me before requesting challenge', async () => {
  const calls = [];
  const api = {
    async me() {
      calls.push('me');
      return { email: 'user@example.test', balance: 0 };
    },
    async challenge() {
      calls.push('challenge');
      return {
        challenge_id: 'cid',
        nonce_prefix: '00',
        difficulty_bits: 0,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      };
    },
    async mint(challengeId, nonce) {
      calls.push(`mint:${challengeId}:${nonce.toString()}`);
      return { token: { id: 'tid' } };
    },
  };

  const result = await runAutomine({ api, rounds: 1, delayMs: 0 });

  assert.equal(result.mined, 1);
  assert.deepEqual(calls.slice(0, 2), ['me', 'challenge']);
  assert.match(calls[2], /^mint:cid:/);
});
