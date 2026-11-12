import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

/** Email + 6-digit code. Used for email verification and password-reset code checks. */
export class VerifyCodeDto {
  @ApiProperty({ description: 'The email the code was sent to', example: 'paul@paysplit.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The 6-digit code from the email', example: '184269' })
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
