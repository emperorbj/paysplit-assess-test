import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenPayload, TokenService } from '../services/token.service';
import { extractBearerToken } from './bearer-token.util';

/**
 * Requires a `password_setup` token (issued by POST /auth/email/verify) and
 * attaches its payload to `request.setupToken`. Access tokens are rejected.
 */
@Injectable()
export class SetupTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; setupToken?: TokenPayload }>();

    const payload = this.tokenService.verify(
      extractBearerToken(request.headers.authorization),
      'password_setup',
    );
    if (!payload) {
      throw new UnauthorizedException(
        'Invalid or expired setup token. Please verify your email again.',
      );
    }

    request.setupToken = payload;
    return true;
  }
}
