import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { solveChallenge, formatHashrate } from './pow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(__dirname, 'pow-worker.cjs');

export function defaultWorkerCount() {
  const count = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, Math.min(count - 1 || 1, 8));
}

export async function mineChallenge({ noncePrefixHex, difficultyBits, startNonce = 0n, workers = 1, progressEveryMs = 1000, expiresAt, signal, onProgress } = {}) {
  const workerCount = Number(workers);
  if (!Number.isInteger(workerCount) || workerCount < 1) throw new Error('workers must be a positive integer');
  if (workerCount === 1) {
    return solveChallenge({
      noncePrefixHex,
      difficultyBits,
      startNonce,
      signal,
      progressEvery: 262144,
      onProgress,
    });
  }

  const cutoffAt = expiresAt ? Date.parse(expiresAt) - 5000 : null;
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const processes = [];
    const workerStats = new Map();
    let settled = false;

    const cleanup = () => {
      for (const worker of processes) worker.terminate().catch(() => {});
      signal?.removeEventListener?.('abort', onAbort);
    };
    const totalHashes = () => {
      let total = 0n;
      for (const stats of workerStats.values()) total += BigInt(stats.hashes || '0');
      return total;
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ nonce: BigInt(startNonce), hashes: Number(totalHashes()), elapsedMs: Date.now() - started, aborted: true });
    };
    signal?.addEventListener?.('abort', onAbort, { once: true });

    for (let i = 0; i < workerCount; i += 1) {
      const worker = new Worker(WORKER_PATH, {
        workerData: {
          noncePrefixHex,
          difficultyBits,
          startNonce: (BigInt(startNonce) + BigInt(i)).toString(),
          stride: String(workerCount),
          cutoffAt,
          progressEveryMs: Math.max(500, Math.floor(progressEveryMs / 2)),
        },
      });
      processes.push(worker);
      workerStats.set(i, { hashes: '0', nonce: (BigInt(startNonce) + BigInt(i)).toString() });

      worker.on('message', (message) => {
        if (settled) return;
        if (message.hashes !== undefined || message.nonce !== undefined) {
          workerStats.set(i, {
            hashes: message.hashes ?? workerStats.get(i)?.hashes ?? '0',
            nonce: message.nonce ?? workerStats.get(i)?.nonce,
          });
        }
        const hashes = totalHashes();
        const elapsedMs = Date.now() - started;
        if (message.type === 'progress') {
          onProgress?.({ hashes: Number(hashes), elapsedMs, workers: workerCount, rate: formatHashrate(Number(hashes), elapsedMs) });
        }
        if (message.type === 'found') {
          settled = true;
          cleanup();
          resolve({
            nonce: BigInt(message.nonce),
            hashes: Number(hashes),
            elapsedMs,
            digest: message.digest,
            workers: workerCount,
          });
        }
        if (message.type === 'expired') {
          settled = true;
          cleanup();
          const err = new Error('challenge expired before a solution was found');
          err.code = 'CHALLENGE_EXPIRED';
          reject(err);
        }
      });

      worker.on('error', (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      });
      worker.on('exit', (code) => {
        if (!settled && code !== 0) {
          settled = true;
          cleanup();
          reject(new Error(`miner worker exited with code ${code}`));
        }
      });
    }
  });
}
