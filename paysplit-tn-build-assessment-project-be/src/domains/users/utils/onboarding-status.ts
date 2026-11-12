import { User } from '../entities/user.entity';
import { KycStatus } from '../constants/kyc-status.constants';
import type { KycStepStatus } from '../../kyc/constants/kyc.constants';
import { EMPTY_SETUP_PROGRESS, SetupProgressFlags } from '../repository/setup-progress.repository';

export type OnboardingNextStep = 'kyc' | 'setup' | 'dashboard';

export interface OnboardingStatus {
  emailVerified: boolean;
  passwordSet: boolean;
  /** Country + phone number captured (FR-03). Part of welcome-modal Step 1. */
  profileCompleted: boolean;
  /** Overall verification status (FR-05). Part of welcome-modal Step 1. */
  kycStatus: KycStatus;
  /** Per-step KYC progress, for the "Complete KYC" stepper. */
  kyc: {
    identityStatus: KycStepStatus;
    livenessStatus: KycStepStatus;
  };
  /** "Configure your Salary Partitions" modal (Income → Wallets → Recipients → Rules). */
  setupChecklist: {
    /** Step 1: employer, monthly salary and payday saved. */
    salaryDateSet: boolean;
    /** Step 2: at least one budget wallet. */
    hasWallet: boolean;
    /** Step 3: at least one beneficiary. */
    hasBeneficiary: boolean;
    /** Step 4: at least one split rule. */
    hasSplitRule: boolean;
    /** Salary source + first rule — the "Setup Checklist" item is done. */
    completed: boolean;
  };
  /** "Complete your account setup" card: Signup Account, Complete KYC, Setup Checklist. */
  progress: {
    signupCompleted: boolean;
    kycCompleted: boolean;
    setupCompleted: boolean;
    /** 0-100, e.g. 34 after signup only. */
    percent: number;
  };
  /** Which step the client should push the user towards next. */
  nextStep: OnboardingNextStep;
}

/**
 * Derives where a user is in onboarding. Drives the post-signup welcome modal,
 * the setup checklist and the dashboard "Complete Onboarding" prompts.
 */
export function buildOnboardingStatus(
  user: User,
  setup: SetupProgressFlags = EMPTY_SETUP_PROGRESS,
): OnboardingStatus {
  const profileCompleted = !!(user.countryCode && user.phoneNumber);
  const kycStatus = user.kycStatus ?? 'not_started';
  const setupCompleted = setup.hasIncome && setup.hasSplitRule;

  const signupCompleted = user.isEmailVerified && !!user.passwordSetAt;
  const kycCompleted = kycStatus === 'approved';
  const doneItems = [signupCompleted, kycCompleted, setupCompleted].filter(Boolean).length;

  let nextStep: OnboardingNextStep = 'dashboard';
  if (!profileCompleted || !kycCompleted) {
    nextStep = 'kyc';
  } else if (!setupCompleted) {
    nextStep = 'setup';
  }

  return {
    emailVerified: user.isEmailVerified,
    passwordSet: !!user.passwordSetAt,
    profileCompleted,
    kycStatus,
    kyc: {
      identityStatus: user.kycVerification?.identityStatus ?? 'not_started',
      livenessStatus: user.kycVerification?.livenessStatus ?? 'not_started',
    },
    setupChecklist: {
      salaryDateSet: setup.hasIncome,
      hasWallet: setup.hasWallet,
      hasBeneficiary: setup.hasBeneficiary,
      hasSplitRule: setup.hasSplitRule,
      completed: setupCompleted,
    },
    progress: {
      signupCompleted,
      kycCompleted,
      setupCompleted,
      percent: Math.ceil((doneItems / 3) * 100),
    },
    nextStep,
  };
}
