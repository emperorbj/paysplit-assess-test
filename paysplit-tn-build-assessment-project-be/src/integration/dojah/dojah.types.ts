/**
 * Normalised Dojah results. Dojah's BVN and NIN responses use different field
 * names and date formats; DojahService maps them into these shapes so the KYC
 * domain never touches raw provider payloads.
 */

export interface DojahPersonRecord {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  /** As returned by Dojah (format varies by product). */
  dateOfBirth: string | null;
}

export interface BvnValidationResult {
  /** BVN exists. */
  valid: boolean;
  /** 0–100 confidence that the supplied first name matches the BVN record. */
  firstNameScore: number | null;
  lastNameScore: number | null;
}

export interface SelfieVerificationResult {
  match: boolean;
  /** 0–100 */
  confidence: number | null;
  record: DojahPersonRecord;
}

export interface LivenessResult {
  isLive: boolean;
  /** 0–100 */
  probability: number | null;
  faceDetected: boolean;
  multipleFaces: boolean;
}

export type DojahDocumentType = 'PASSPORT' | 'DRIVING_LICENSE';

export interface DocumentAnalysisResult {
  valid: boolean;
  reason: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  expiryDate: string | null;
}

export interface FaceCompareResult {
  match: boolean;
  /** 0–100 */
  confidence: number | null;
}
