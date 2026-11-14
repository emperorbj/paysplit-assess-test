import type { KycProvider } from "./kyc-provider.js"

/**
 * Offline provider for tests and local work without Dojah. It mirrors the
 * sandbox: the test BVN/NIN are found, any number starting "000" is not, a
 * tiny image (< 1KB) has no face, and everything else passes.
 */
export function createMockKycProvider(): KycProvider {
  return {
    name: "mock",

    async lookupBankIdentity(_method, idNumber) {
      if (idNumber.startsWith("000")) return { found: false, reason: "No record found" }
      return {
        found: true,
        firstName: "John",
        lastName: "Doe",
        reference: `mock-${idNumber.slice(-4)}`,
      }
    },

    async checkDocument({ front }) {
      if (front.length < 1024)
        return { valid: false, reason: "We couldn't read that document" }
      return { valid: true, reference: "mock-document", documentName: "Mock document" }
    },

    async checkLiveness(selfie) {
      if (selfie.length < 1024)
        return { passed: false, code: "NO_FACE_DETECTED", reason: "No face was detected" }
      return { passed: true, probability: 99, reference: "mock-liveness" }
    },
  }
}
