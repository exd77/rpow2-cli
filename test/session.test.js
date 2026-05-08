import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCookie, extractSessionCookie, maskCookie } from '../src/session.js';

test('extractSessionCookie extracts rpow_session from a raw Cookie header', () => {
  const raw = 'foo=bar; rpow_session=abc.def.sig; theme=green';
  assert.equal(extractSessionCookie(raw), 'rpow_session=abc.def.sig');
});

test('normalizeCookie accepts bare token and converts it into Cookie header form', () => {
  assert.equal(normalizeCookie('abc.def.sig'), 'rpow_session=abc.def.sig');
});

test('normalizeCookie accepts full Cookie header and keeps only session cookie', () => {
  assert.equal(normalizeCookie('x=1; rpow_session=token123; y=2'), 'rpow_session=token123');
});

test('normalizeCookie rejects missing session cookie', () => {
  assert.throws(() => normalizeCookie('x=1; y=2'), /rpow_session/);
});

test('maskCookie hides most of the session token for logging', () => {
  assert.equal(maskCookie('rpow_session=abcdefghijklmnopqrstuvwxyz'), 'rpow_session=abcdef...uvwxyz');
});
