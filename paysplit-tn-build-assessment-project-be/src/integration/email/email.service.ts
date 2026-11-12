import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import * as ejs from 'ejs';
import { join } from 'path';
import { existsSync } from 'fs';

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** Template name (without extension) in integration/email/templates */
  template: string;
  data: Record<string, unknown>;
  /**
   * When true, delivery failures are thrown to the caller. Defaults to false so
   * request-path flows (signup codes) are never blocked by the mail provider;
   * the failure is logged and the user can use "resend".
   */
  throwOnFailure?: boolean;
}

/** `mocked` = no SMTP configured (logged instead); `failed` = SMTP rejected the send. */
export type SendEmailResult = 'sent' | 'mocked' | 'failed';

/** Plain-text alternative for clients that don't render HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&copy;/g, '©')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Sends templated emails over SMTP (ZeptoMail in production).
 *
 * Without SMTP credentials it runs in MOCK mode and logs instead of sending,
 * so local development works without a mail provider.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly templateDir: string;

  private transporter: Transporter | null = null;

  constructor(private configService: ConfigService) {
    const fromEmail = this.configService.get<string>('smtp.from', 'noreply@paysplit.com');
    const fromName = this.configService.get<string>('email.fromName', 'PaySplit');
    this.from = `"${fromName}" <${fromEmail}>`;

    // Set the template directory with fallback for dev/compilation environments
    const possiblePaths = [
      join(__dirname, 'templates'),
      join(process.cwd(), 'src', 'integration', 'email', 'templates'),
    ];
    let resolvedPath = possiblePaths[0];
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        resolvedPath = p;
        break;
      }
    }
    this.templateDir = resolvedPath;

    const host = this.configService.get<string>('smtp.host');
    const port = this.configService.get<number>('smtp.port', 587);
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.pass');

    if (host && user && pass) {
      this.transporter = createTransport({
        host,
        port,
        // 465 = implicit TLS; 587 = plain connection upgraded with STARTTLS (required).
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user, pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
      this.logger.log(`Email service initialized (SMTP ${host}:${port})`);
    } else {
      this.logger.warn(
        'SMTP is not configured. Email service running in MOCK mode (logging to console).',
      );
    }
  }

  /** Checks the SMTP connection and credentials at startup. Never blocks boot. */
  onModuleInit(): void {
    this.transporter
      ?.verify()
      .then(() => this.logger.log('SMTP connection verified'))
      .catch((error: Error) => this.logger.error(`SMTP connection check failed: ${error.message}`));
  }

  /**
   * Generic templated send — the single render / deliver / mock-fallback path
   * every email goes through. Only template rendering errors are always thrown;
   * delivery errors throw only when `throwOnFailure` is set.
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const { to, subject, template, data, throwOnFailure = false } = options;

    // Rendering errors always bubble up: a missing/broken template is a bug.
    const templatePath = join(this.templateDir, `${template}.ejs`);
    let htmlBody: string;
    try {
      htmlBody = await ejs.renderFile(templatePath, data);
    } catch (error) {
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(`Failed to render email template "${template}" for ${to}`, stack);
      throw error;
    }

    if (!this.transporter) {
      // No SMTP credentials — pure mock mode.
      this.logMockEmail(to, subject);
      return 'mocked';
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html: htmlBody,
        text: htmlToText(htmlBody),
      });
      this.logger.log(`Email "${subject}" sent successfully to ${to}`);
      return 'sent';
    } catch (deliveryError) {
      const message =
        deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
      if (throwOnFailure) {
        this.logger.error(`Email delivery to ${to} failed: ${message}`);
        throw deliveryError;
      }
      // The SMTP server rejected the send. Don't block request-path flows (signup).
      this.logger.error(`Email delivery to ${to} failed: ${message}`);
      return 'failed';
    }
  }

  private logMockEmail(to: string, subject: string): void {
    this.logger.log('--- [MOCK EMAIL SENT] ---');
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log('--------------------------');
  }

  async sendEmailVerificationCode(
    to: string,
    otp: string,
    firstName: string | null,
    expiresInMinutes: number,
  ): Promise<void> {
    await this.sendOtp(to, otp, 'Verify your PaySplit email', {
      heading: 'Verify your email',
      intro: 'Use the code below to verify your email and finish creating your PaySplit account.',
      firstName,
      expiresInMinutes,
    });
  }

  async sendPasswordResetCode(
    to: string,
    otp: string,
    firstName: string | null,
    expiresInMinutes: number,
  ): Promise<void> {
    await this.sendOtp(to, otp, 'Reset your PaySplit password', {
      heading: 'Reset your password',
      intro: 'Use the code below to reset your PaySplit password.',
      firstName,
      expiresInMinutes,
    });
  }

  /** FR-24 "Verification result" email, sent when KYC is approved. */
  async sendKycApproved(to: string, firstName: string | null): Promise<void> {
    await this.send({
      to,
      subject: 'Your PaySplit identity is verified',
      template: 'kyc-approved',
      data: { firstName },
    });
  }

  private async sendOtp(
    to: string,
    otp: string,
    subject: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const result = await this.send({ to, subject, template: 'otp', data: { ...data, otp } });
    // Mock mode only (no SMTP configured): local dev reads the code from the log.
    // Never logged when real delivery was attempted, and never in production.
    if (result === 'mocked' && this.configService.get<string>('env') !== 'production') {
      this.logger.log(`OTP Code for ${to}: ${otp}`);
    }
  }
}
