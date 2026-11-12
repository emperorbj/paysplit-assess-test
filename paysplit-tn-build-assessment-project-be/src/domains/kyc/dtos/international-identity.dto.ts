import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { DOCUMENT_METHODS, type DocumentMethod } from '../constants/kyc.constants';

/** Multipart form fields for the international ID upload. */
export class InternationalIdentityDto {
  @ApiProperty({ enum: DOCUMENT_METHODS, example: 'passport' })
  @IsIn(DOCUMENT_METHODS)
  documentType: DocumentMethod;
}

/** Swagger-only description of the full multipart body. */
export class InternationalIdentityUploadDto extends InternationalIdentityDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Front of the document (PNG/JPG, max 2MB)',
  })
  front: unknown;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Back of the document, if it has one (PNG/JPG, max 2MB)',
  })
  back?: unknown;
}

/** Swagger-only description of the selfie upload. */
export class SelfieUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Selfie (PNG/JPG, max 2MB)' })
  selfie: unknown;
}
