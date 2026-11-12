import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Protects /internal/jobs/* with the X-Job-Secret header (JOBS_SECRET).
 * Answers 404 when the secret is missing or wrong, so the routes aren't discoverable.
 */
@Injectable()
export class JobSecretGuard implements CanActivate {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.secret = configService.get<string>('jobs.secret', '');
  }

  canActivate(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest<Request>().header('x-job-secret') ?? '';
    // Hash both sides so the comparison is constant-time regardless of length.
    if (!this.secret || !timingSafeEqual(digest(header), digest(this.secret))) {
      throw new NotFoundException();
    }
    return true;
  }
}
