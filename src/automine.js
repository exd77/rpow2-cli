import { RpowApi } from './api.js';
import { formatHashrate } from './pow.js';
import { mineChallenge } from './miner.js';
import { fmtNum, logSection } from './ui.js';

export async function checkBalance(api) {
  const me = await api.me();
  console.log(`Email    : ${me.email}`);
  console.log(`Balance  : ${fmtNum(me.balance)} RPOW`);
  console.log(`Minted   : ${fmtNum(me.minted)}`);
  console.log(`Sent     : ${fmtNum(me.sent)}`);
  console.log(`Received : ${fmtNum(me.received)}`);
  return me;
}

export async function showLedger(api) {
  const l = await api.ledger();
  console.log(`Total minted       : ${fmtNum(l.total_minted)} / ${fmtNum(l.max_supply)}`);
  console.log(`Circulating supply : ${fmtNum(l.circulating_supply)}`);
  console.log(`Total transferred  : ${fmtNum(l.total_transferred)}`);
  console.log(`Users              : ${fmtNum(l.user_count)}`);
  console.log(`Difficulty         : ${l.current_difficulty_bits} trailing zero bits`);
  console.log(`Next milestone     : ${fmtNum(l.next_milestone_at)} (${fmtNum(l.coins_until_next_milestone)} left)`);
  console.log(`Next difficulty    : ${l.next_difficulty_bits}`);
  return l;
}

export async function runAutomine({ api, rounds = Infinity, delayMs = 1000, workers = 1, signal } = {}) {
  if (!api) throw new Error('api is required');
  let mined = 0;
  const started = Date.now();

  console.log('Verifying session via GET /me ...');
  await api.me({ maxRetries: Infinity });

  while (mined < rounds) {
    if (signal?.aborted) break;
    logSection(`ROUND ${mined + 1}`);
    const ch = await api.challenge();
    console.log(`challenge : ${ch.challenge_id}`);
    console.log(`difficulty: ${ch.difficulty_bits} trailing zero bits`);
    console.log(`expires   : ${ch.expires_at}`);

    let lastPrint = 0;
    console.log(`workers   : ${workers}`);
    const solved = await mineChallenge({
      noncePrefixHex: ch.nonce_prefix,
      difficultyBits: ch.difficulty_bits,
      workers,
      progressEveryMs: 1000,
      expiresAt: ch.expires_at,
      signal,
      onProgress: ({ hashes, elapsedMs }) => {
        const now = Date.now();
        if (now - lastPrint > 1000) {
          lastPrint = now;
          process.stdout.write(`\rhashes=${fmtNum(hashes)} rate=${formatHashrate(hashes, elapsedMs)} workers=${workers}`);
        }
      },
    });
    process.stdout.write('\n');
    console.log(`found nonce: ${solved.nonce.toString()}`);
    console.log(`hashes     : ${fmtNum(solved.hashes)}`);
    console.log(`rate       : ${formatHashrate(solved.hashes, solved.elapsedMs)}`);

    const mint = await api.mint(ch.challenge_id, solved.nonce);
    mined++;
    console.log(`minted token: ${mint.token.id}`);
    console.log(`mined run   : ${fmtNum(mined)}`);
    console.log(`elapsed run : ${Math.round((Date.now() - started) / 1000)}s`);

    if (delayMs > 0 && mined < rounds) await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return { mined, elapsedMs: Date.now() - started };
}

export function createApi(cookie, apiBase) {
  return new RpowApi({ cookie, apiBase });
}
