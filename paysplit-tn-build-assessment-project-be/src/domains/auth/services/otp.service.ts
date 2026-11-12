import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { OtpRepository } from '../repository/otp.repository';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MINUTES,
  OtpType,
} from '../constants/otp.constants';

export interface VerifyOtpOptions {
  /**
   * true  — delete the code on success (single-step flows such as email verification).
   * false — keep it and mark it verified so a later step can consume it (password reset).
   */
  consume: boolean;
}

@Injectable()
export class OtpService {
  private readonly hashKey: string;

  constructor(
    private readonly otpRepository: OtpRepository,
    configService: ConfigService,
  ) {
    this.hashKey = configService.getOrThrow<string>('jwt.secret');
  }

  /** Issues a fresh 6-digit code (replacing any previous one) and returns it in plain text. */
  async issue(email: string, type: OtpType): Promise<string> {
    await this.otpRepository.deleteByEmailAndType(email, type);

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await this.otpRepository.create({ email, type, codeHash: this.hash(code), otpExpiresAt });
    return code;
  }

  /** Seconds until another code may be sent for this email + purpose (0 = send now). */
  async getResendCooldown(email: string, type: OtpType): Promise<number> {
    const latest = await this.otpRepository.findLatest(email, type);
    if (!latest) return 0;

    const elapsedSeconds = (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
    return Math.max(0, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds));
  }

  /**
   * Checks a code against the latest one issued for this email + purpose.
   * Every wrong guess counts; the code is destroyed after OTP_MAX_ATTEMPTS.
   */
  async verify(
    email: string,
    type: OtpType,
    code: string,
    { consume }: VerifyOtpOptions,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findLatest(email, type);
    if (!otp) return false;

    if (new Date() > otp.otpExpiresAt || otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.otpRepository.deleteById(otp.id);
      return false;
    }

    if (!this.matches(code, otp.codeHash)) {
      if (otp.attempts + 1 >= OTP_MAX_ATTEMPTS) {
        await this.otpRepository.deleteById(otp.id);
      } else {
        await this.otpRepository.incrementAttempts(otp.id);
      }
      return false;
    }

    if (consume) {
      await this.otpRepository.deleteById(otp.id);
    } else {
      await this.otpRepository.markAsVerified(otp.id);
    }
    return true;
  }

  /** True when a code for this purpose was verified (with consume: false) and not yet used. */
  async hasVerified(email: string, type: OtpType): Promise<boolean> {
    const otp = await this.otpRepository.findVerified(email, type);
    return !!otp && new Date() <= otp.otpExpiresAt;
  }

  async consumeVerified(email: string, type: OtpType): Promise<void> {
    const otp = await this.otpRepository.findVerified(email, type);
    if (otp) await this.otpRepository.deleteById(otp.id);
  }

  private hash(code: string): string {
    return createHmac('sha256', this.hashKey).update(code).digest('hex');
  }

  private matches(code: string, storedHash: string): boolean {
    const candidate = Buffer.from(this.hash(code), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    return candidate.length === stored.length && timingSafeEqual(candidate, stored);
  }
}
