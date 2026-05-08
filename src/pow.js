import { createHash } from 'node:crypto';

export function trailingZeroBits(buf) {
  let count = 0;
  for (let i = buf.length - 1; i >= 0; i--) {
    const b = buf[i];
    if (b === 0) { count += 8; continue; }
    let bit = 0;
    while ((b & (1 << bit)) === 0) bit++;
    return count + bit;
  }
  return count;
}

export function u64le(n) {
  if (typeof n !== 'bigint') n = BigInt(n);
  if (n < 0n || n > 0xffffffffffffffffn) throw new RangeError('nonce must fit uint64');
  const out = Buffer.alloc(8);
  let x = n;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

export function verifySolution(noncePrefixHex, nonce, difficultyBits) {
  const prefix = Buffer.from(noncePrefixHex, 'hex');
  const digest = createHash('sha256').update(prefix).update(u64le(nonce)).digest();
  return trailingZeroBits(digest) >= difficultyBits;
}

export async function solveChallenge({ noncePrefixHex, difficultyBits, startNonce = 0n, progressEvery = 65536, onProgress, signal }) {
  const prefix = Buffer.from(noncePrefixHex, 'hex');
  let nonce = BigInt(startNonce);
  let hashes = 0n;
  const startedAt = Date.now();

  while (nonce <= 0xffffffffffffffffn) {
    if (signal?.aborted) throw new Error('mining aborted');
    const digest = createHash('sha256').update(prefix).update(u64le(nonce)).digest();
    hashes++;
    if (trailingZeroBits(digest) >= difficultyBits) {
      return { nonce, hashes, elapsedMs: Date.now() - startedAt };
    }
    nonce++;
    if (progressEvery > 0 && hashes % BigInt(progressEvery) === 0n) {
      onProgress?.({ nonce, hashes, elapsedMs: Date.now() - startedAt });
      // Yield so Ctrl+C and readline remain responsive.
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  throw new Error('nonce space exhausted');
}

export function formatHashrate(hashes, elapsedMs) {
  if (!elapsedMs) return '0 H/s';
  const rate = Number(hashes) / (elapsedMs / 1000);
  if (rate >= 1e6) return `${(rate / 1e6).toFixed(2)} MH/s`;
  if (rate >= 1e3) return `${(rate / 1e3).toFixed(2)} KH/s`;
  return `${rate.toFixed(2)} H/s`;
}
