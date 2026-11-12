import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../services/token.service';

/** The verified password-setup token payload. Use with `SetupTokenGuard`. */
export const SetupToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenPayload =>
    ctx.switchToHttp().getRequest<{ setupToken: TokenPayload }>().setupToken,
);
