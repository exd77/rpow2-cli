export function explainApiError(err) {
  const message = err?.message ?? String(err);
  const cause = err?.cause;
  const causeCode = cause?.code;
  const causeMessage = cause?.message;

  if (/resend:\s*API key is invalid/i.test(message)) {
    return 'RPOW2 could not send the magic link because the upstream Resend API key is invalid. This is not your Gmail account and not a mining bug. Try logging in from the website; if the website also fails, wait for the RPOW2 operator to fix the email provider. If you already have an old browser session, paste the rpow_session cookie directly.';
  }

  if (/^fetch failed$/i.test(message)) {
    const detail = [causeCode, causeMessage].filter(Boolean).join(' - ');
    return `Network/TLS/DNS connection to api.rpow2.com failed. This does not automatically mean your cookie is wrong. Check server connectivity to https://api.rpow2.com/ledger, DNS, VPN/proxy/firewall, and Node.js. Detail: ${detail || message}`;
  }

  return message;
}
