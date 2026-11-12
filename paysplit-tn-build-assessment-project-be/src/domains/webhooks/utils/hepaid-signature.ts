import { createHmac, timingSafeEqual } from 'crypto';

/** HePaid recommends rejecting signatures older than 5 minutes (each retry is re-signed). */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Checks a `HePaid-Signature: t=<unix seconds>,v1=<hex>` header: v1 must be the
 * HMAC-SHA256 (lowercase hex) of `{t}.{raw body}` keyed with the whole endpoint
 * secret (including `whsec_`), and t must be recent.
 * https://hepaid-docs.tobee.dev/webhooks#check-the-signature
 */
export function verifyHepaidSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  if (!header || !secret) return false;

  const parts = new Map<string, string>();
  for (const part of header.split(',')) {
    const index = part.indexOf('=');
    if (index > 0) parts.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  const t = parts.get('t') ?? '';
  const v1 = parts.get('v1') ?? '';
  if (!/^\d+$/.test(t) || !/^[0-9a-f]+$/.test(v1)) return false;
  if (Math.abs(nowSeconds - Number(t)) > toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest('hex');
  return v1.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}

/** Builds a header the way HePaid does (tests and local tooling). */
export function signHepaidPayload(rawBody: string, secret: string, t: number): string {
  const v1 = createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest('hex');
  return `t=${t},v1=${v1}`;
}
