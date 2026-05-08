import test from 'node:test';
import assert from 'node:assert/strict';
import { explainApiError } from '../src/errors.js';

test('explainApiError identifies upstream RPOW2 Resend API key failure', () => {
  const err = new Error('Internal Server Error: resend: API key is invalid');
  const explanation = explainApiError(err);
  assert.match(explanation, /RPOW2/i);
  assert.match(explanation, /Resend API key/i);
  assert.match(explanation, /not your Gmail/i);
});

test('explainApiError explains Node fetch failed network causes', () => {
  const err = new TypeError('fetch failed', {
    cause: Object.assign(new Error('connect ETIMEDOUT 104.21.1.1:443'), { code: 'ETIMEDOUT' }),
  });
  const explanation = explainApiError(err);
  assert.match(explanation, /network/i);
  assert.match(explanation, /api\.rpow2\.com/i);
  assert.match(explanation, /ETIMEDOUT/i);
  assert.match(explanation, /cookie is wrong/i);
});

test('explainApiError keeps generic message for unrelated errors', () => {
  const err = new Error('UNAUTHORIZED: login required');
  assert.equal(explainApiError(err), 'UNAUTHORIZED: login required');
});
