/**
 * True when the Dojah base URL points at the sandbox. Sandbox identities are
 * shared fakes (same person and stock photo for every test BVN/NIN), so KYC
 * relaxes the checks that assume real, unique people. See KycService.
 */
export function isDojahSandboxUrl(baseUrl: string | undefined | null): boolean {
  if (!baseUrl) return false;
  try {
    return new URL(baseUrl).hostname.toLowerCase() === 'sandbox.dojah.io';
  } catch {
    return false;
  }
}
