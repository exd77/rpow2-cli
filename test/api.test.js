import test from 'node:test';
import assert from 'node:assert/strict';
import { RpowApi } from '../src/api.js';

test('RpowApi sends cookie and parses challenge response', async () => {
  const calls = [];
  const api = new RpowApi({
    apiBase: 'https://api.example.test',
    cookie: 'rpow_session=abc',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        challenge_id: 'cid', nonce_prefix: '00ff', difficulty_bits: 8, expires_at: 'later'
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  const ch = await api.challenge();
  assert.equal(ch.challenge_id, 'cid');
  assert.equal(calls[0].url, 'https://api.example.test/challenge');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.cookie, 'rpow_session=abc');
});

test('RpowApi throws helpful error on API failure body', async () => {
  const api = new RpowApi({
    apiBase: 'https://api.example.test/',
    cookie: 'rpow_session=abc',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'login required' }), { status: 401 })
  });
  await assert.rejects(() => api.me(), /UNAUTHORIZED: login required/);
});

test('RpowApi mint sends challenge id and decimal nonce', async () => {
  let body = '';
  const api = new RpowApi({
    apiBase: 'https://api.example.test',
    cookie: 'rpow_session=abc',
    fetchImpl: async (_url, options) => {
      body = options.body;
      return new Response(JSON.stringify({ token: { id: 'tid', value: 1, issued_at: 'now' } }), { status: 200 });
    }
  });
  const res = await api.mint('challenge', 123n);
  assert.equal(res.token.id, 'tid');
  assert.deepEqual(JSON.parse(body), { challenge_id: 'challenge', solution_nonce: '123' });
});
