import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { normalizeCookie } from './session.js';

export const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), '.rpow2-session.json');

export async function loadSession(file = DEFAULT_CONFIG_PATH) {
  if (process.env.RPOW_COOKIE) return { cookie: normalizeCookie(process.env.RPOW_COOKIE), source: 'RPOW_COOKIE env' };
  if (!existsSync(file)) return null;
  const raw = await readFile(file, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.cookie) return null;
  return { ...parsed, cookie: normalizeCookie(parsed.cookie), source: file };
}

export async function saveSession(cookie, file = DEFAULT_CONFIG_PATH) {
  const normalized = normalizeCookie(cookie);
  await writeFile(file, JSON.stringify({ cookie: normalized, saved_at: new Date().toISOString() }, null, 2));
  return { cookie: normalized, source: file };
}
