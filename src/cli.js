#!/usr/bin/env node
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { RpowApi } from './api.js';
import { loadSession, saveSession } from './config.js';
import { maskCookie } from './session.js';
import { BANNER, renderMenu, logSection } from './ui.js';
import { checkBalance, showLedger, runAutomine } from './automine.js';
import { defaultWorkerCount } from './miner.js';
import { explainApiError } from './errors.js';

const API_BASE = process.env.RPOW_API ?? 'https://api.rpow2.com';
const rl = readline.createInterface({ input, output });
let session = await loadSession();
let api = new RpowApi({ apiBase: API_BASE, cookie: session?.cookie });

function ensureSession() {
  if (!session?.cookie) throw new Error('No saved session yet. Choose [1] first, then paste your rpow_session cookie.');
  api.setCookie(session.cookie);
}

async function prompt(question) {
  return (await rl.question(question)).trim();
}

async function loginHelper() {
  logSection('EMAIL LOGIN');
  console.log('Safe flow: this CLI asks RPOW2 for a magic link, you open it in your browser, then paste the rpow_session cookie back here.');
  console.log('Note: the CLI never reads your email/password and does not bypass login.');
  const email = await prompt('Enter your RPOW2 email: ');
  if (!email) return;
  try {
    await api.authRequest(email);
    console.log(`Magic link requested for: ${email}`);
  } catch (err) {
    console.log(`Could not request the magic link: ${explainApiError(err)}`);
    console.log('If you are already logged in from a browser, you can still paste your rpow_session cookie manually.');
  }

  console.log('\nAfter opening the magic link and logging in from your browser:');
  console.log('1. Open DevTools > Application/Storage > Cookies.');
  console.log('2. Find the cookie named rpow_session on rpow2.com or api.rpow2.com.');
  console.log('3. Copy either the cookie value or the full Cookie header.');
  const cookieInput = await prompt('\nPaste rpow_session or Cookie header here: ');
  if (!cookieInput) return;
  session = await saveSession(cookieInput);
  api.setCookie(session.cookie);
  console.log(`Session saved: ${maskCookie(session.cookie)}`);
}

async function automineMenu() {
  ensureSession();
  logSection('AUTOMINE');
  console.log('Tip: start with 1-3 rounds first. Press Ctrl+C anytime to stop.');
  const rawRounds = await prompt('How many RPOW should we mine? Leave blank for infinite: ');
  const rounds = rawRounds ? Number.parseInt(rawRounds, 10) : Infinity;
  if (!Number.isFinite(rounds) && rawRounds) throw new Error('Invalid round count');
  const defaultWorkers = defaultWorkerCount();
  const rawWorkers = await prompt(`CPU workers? Leave blank for ${defaultWorkers}: `);
  const workers = rawWorkers ? Number.parseInt(rawWorkers, 10) : defaultWorkers;
  if (!Number.isInteger(workers) || workers < 1) throw new Error('Invalid worker count');
  const controller = new AbortController();
  const onSigint = () => {
    console.log('\nStop requested, waiting for the current loop to finish...');
    controller.abort();
  };
  process.once('SIGINT', onSigint);
  try {
    await runAutomine({ api, rounds, workers, signal: controller.signal });
  } finally {
    process.off('SIGINT', onSigint);
  }
}

async function showSession() {
  logSection('SESSION');
  if (!session?.cookie) {
    console.log('No saved session yet.');
    return;
  }
  console.log(`Source : ${session.source ?? '.rpow2-session.json'}`);
  console.log(`Cookie : ${maskCookie(session.cookie)}`);
  console.log(`API    : ${API_BASE}`);
}

async function main() {
  if (session?.cookie) console.log(`Loaded session: ${maskCookie(session.cookie)}\n`);

  while (true) {
    console.log(renderMenu());
    const choice = await prompt('Choose an option: ');
    try {
      if (choice === '1') await loginHelper();
      else if (choice === '2') await automineMenu();
      else if (choice === '3') { ensureSession(); logSection('BALANCE'); await checkBalance(api); }
      else if (choice === '4') { logSection('LEDGER'); await showLedger(api); }
      else if (choice === '5') await showSession();
      else if (choice === '0' || choice.toLowerCase() === 'q') break;
      else console.log('Unknown option.');
    } catch (err) {
      console.error(`ERROR: ${explainApiError(err)}`);
    }
  }
  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
  process.exitCode = 1;
});
