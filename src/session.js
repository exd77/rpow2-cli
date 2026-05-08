export const SESSION_COOKIE_NAME = 'rpow_session';

export function extractSessionCookie(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(';').map(s => s.trim()).filter(Boolean);
  const found = parts.find(p => p.startsWith(`${SESSION_COOKIE_NAME}=`));
  return found ?? null;
}

export function normalizeCookie(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error(`missing ${SESSION_COOKIE_NAME} cookie`);

  if (raw.includes('=')) {
    const session = extractSessionCookie(raw);
    if (!session) throw new Error(`could not find ${SESSION_COOKIE_NAME} in cookie header`);
    return session;
  }

  return `${SESSION_COOKIE_NAME}=${raw}`;
}

export function maskCookie(cookie) {
  const normalized = normalizeCookie(cookie);
  const [name, value] = normalized.split('=');
  if (value.length <= 12) return `${name}=***`;
  return `${name}=${value.slice(0, 6)}...${value.slice(-6)}`;
}
