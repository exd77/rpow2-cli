import { fetch as undiciFetch } from 'undici';

const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function errorCode(err) {
  return err?.code || err?.cause?.code || err?.cause?.cause?.code;
}

function isTransientNetworkError(err) {
  return err?.name === 'AbortError'
    || err?.message === 'fetch failed'
    || TRANSIENT_CODES.has(errorCode(err));
}

function retryAfterMs(headers) {
  const value = headers.get?.('retry-after');
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

export class RpowApi {
  constructor({
    apiBase = 'https://api.rpow2.com',
    siteOrigin = 'https://rpow2.com',
    cookie,
    fetchImpl = globalThis.fetch ?? undiciFetch,
    timeoutMs = 20_000,
    maxRetries = 5,
    retryDelayMs = 500,
  } = {}) {
    this.apiBase = apiBase.replace(/\/$/, '');
    this.siteOrigin = siteOrigin.replace(/\/$/, '');
    this.cookie = cookie;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = Number(timeoutMs);
    this.maxRetries = Number(maxRetries);
    this.retryDelayMs = Number(retryDelayMs);
  }

  setCookie(cookie) { this.cookie = cookie; }

  async request(path, { method = 'GET', body, maxRetries = this.maxRetries } = {}) {
    const url = `${this.apiBase}${path}`;
    let attempt = 0;

    while (true) {
      attempt += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers = {
          accept: 'application/json, text/plain, */*',
          origin: this.siteOrigin,
          referer: `${this.siteOrigin}/`,
          'user-agent': 'rpow2-automine-cli/0.1',
        };
        if (this.cookie) headers.cookie = this.cookie;
        if (body !== undefined) headers['content-type'] = 'application/json';

        const res = await this.fetchImpl(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: 'manual',
          signal: controller.signal,
        });
        const text = await res.text();
        let data = null;
        if (text) {
          try { data = JSON.parse(text); }
          catch { data = { message: text }; }
        }
        if (!res.ok) {
          const code = data?.error;
          const prefix = code ? `${code}: ` : '';
          const message = data?.message ?? res.statusText ?? `HTTP ${res.status}`;
          const err = new Error(`${prefix}${message}`);
          err.status = res.status;
          err.code = code;
          err.body = data;
          err.retryable = [408, 425, 429, 500, 502, 503, 504].includes(res.status);
          err.retryAfterMs = retryAfterMs(res.headers);
          throw err;
        }
        return data;
      } catch (err) {
        const retryable = err.retryable || isTransientNetworkError(err);
        if (!retryable || attempt > maxRetries) throw err;
        const backoff = Math.min(30_000, this.retryDelayMs * 2 ** (attempt - 1));
        const delay = Math.max(backoff, Math.min(err.retryAfterMs || 0, 60_000));
        console.warn(`WARN: request ${method} ${path} failed (${err.message}); retry ${attempt}/${maxRetries} in ${delay}ms`);
        await sleep(delay);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  authRequest(email) {
    return this.request('/auth/request', { method: 'POST', body: { email }, maxRetries: 0 });
  }

  me(options) { return this.request('/me', options); }
  ledger(options) { return this.request('/ledger', options); }
  challenge(options) { return this.request('/challenge', { method: 'POST', ...(options ?? {}) }); }
  mint(challengeId, nonce, options) {
    return this.request('/mint', {
      method: 'POST',
      body: { challenge_id: challengeId, solution_nonce: nonce.toString() },
      ...(options ?? {}),
    });
  }
}
