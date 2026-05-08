import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { trailingZeroBits, u64le, verifySolution, solveChallenge } from '../src/pow.js';

test('trailingZeroBits counts from the end of the digest buffer', () => {
  assert.equal(trailingZeroBits(Buffer.from([0xff])), 0);
  assert.equal(trailingZeroBits(Buffer.from([0x10])), 4);
  assert.equal(trailingZeroBits(Buffer.from([0xab, 0x00])), 8);
  assert.equal(trailingZeroBits(Buffer.from([0xab, 0x80, 0x00])), 15);
});

test('u64le encodes nonce as unsigned 64-bit little endian', () => {
  assert.equal(u64le(1n).toString('hex'), '0100000000000000');
  assert.equal(u64le(0x0102030405060708n).toString('hex'), '0807060504030201');
});

test('verifySolution matches the server hash format nonce_prefix || solution_nonce_le', () => {
  const prefix = Buffer.from('aabbccddeeff00112233445566778899', 'hex');
  const nonce = 42n;
  const digest = createHash('sha256').update(prefix).update(u64le(nonce)).digest();
  const bits = trailingZeroBits(digest);
  assert.equal(verifySolution(prefix.toString('hex'), nonce, bits), true);
  assert.equal(verifySolution(prefix.toString('hex'), nonce, bits + 1), false);
});

test('solveChallenge finds a valid low-difficulty solution and reports hashes', async () => {
  const prefixHex = '000102030405060708090a0b0c0d0e0f';
  const result = await solveChallenge({ noncePrefixHex: prefixHex, difficultyBits: 8, progressEvery: 1000 });
  assert.equal(typeof result.nonce, 'bigint');
  assert.equal(result.hashes > 0n, true);
  assert.equal(verifySolution(prefixHex, result.nonce, 8), true);
});
