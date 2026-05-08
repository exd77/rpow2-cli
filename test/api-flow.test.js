import test from 'node:test';
import assert from 'node:assert/strict';
import { RpowApi } from '../src/api.js';

test('RpowApi uses browser-like RPOW2 headers and timeout signal', async () => {
  const calls = [];
  const api = new RpowApi({
    apiBase: 'https://api.example.test',
    cookie: 'rpow_session=abc',
    siteOrigin: 'https://rpow2.com',
    timeoutMs: 1234,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  await api.challenge();

  const { options } = calls[0];
  assert.equal(options.headers.accept, 'application/json, text/plain, */*');
  assert.equal(options.headers.origin, 'https://rpow2.com');
  assert.equal(options.headers.referer, 'https://rpow2.com/');
  assert.match(options.headers['user-agent'], /rpow2-automine-cli/);
  assert.equal(options.headers.cookie, 'rpow_session=abc');
  assert.equal(options.headers['content-type'], undefined);
  assert.equal(options.signal instanceof AbortSignal, true);
});

test('RpowApi retries transient fetch failed errors before succeeding', async () => {
  let attempts = 0;
  const api = new RpowApi({
    apiBase: 'https://api.example.test',
    maxRetries: 2,
    retryDelayMs: 1,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        const err = new TypeError('fetch failed');
        err.cause = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
        throw err;
      }
      return new Response(JSON.stringify({ total_minted: 1 }), { status: 200 });
    },
  });

  const ledger = await api.ledger();

  assert.equal(ledger.total_minted, 1);
  assert.equal(attempts, 2);
});

test('RpowApi marks API errors with status and code for mining flow decisions', async () => {
  const api = new RpowApi({
    apiBase: 'https://api.example.test',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'login required' }), { status: 401 }),
  });

  await assert.rejects(
    () => api.me(),
    (err) => {
      assert.equal(err.status, 401);
      assert.equal(err.code, 'UNAUTHORIZED');
      assert.equal(err.message, 'UNAUTHORIZED: login required');
      return true;
    },
  );
});
