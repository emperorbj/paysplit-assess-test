import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * "Create an account" modal: first name, last name, email.
 * The password is set after email verification (POST /auth/password/set).
 */
export class SignupDto {
  @ApiProperty({ description: 'First name of the user', example: 'Paul' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Obi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Email address', example: 'paul@paysplit.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
