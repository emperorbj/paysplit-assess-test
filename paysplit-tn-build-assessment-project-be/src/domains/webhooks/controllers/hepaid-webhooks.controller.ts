import { Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { HepaidWebhooksService } from '../services/hepaid-webhooks.service';

/**
 * Register in the HePaid console (Products → product → Webhooks → Add endpoint):
 *   https://<api host>/api/v1/webhooks/hepaid
 * and set the endpoint's whsec_... secret as HEPAID_WEBHOOK_SECRET.
 */
@ApiTags('webhooks')
@SkipThrottle()
@Controller('webhooks')
export class HepaidWebhooksController {
  constructor(private readonly webhooks: HepaidWebhooksService) {}

  @Post('hepaid')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async hepaid(
    @Req() req: RawBodyRequest<Request>,
    @Headers('hepaid-signature') signature?: string,
  ) {
    const { event, record, duplicate } = await this.webhooks.receive(req.rawBody, signature);
    // Answer within HePaid's 10 seconds; the work happens after the response.
    if (!duplicate) void this.webhooks.process(event, record);
    return { received: true, duplicate };
  }
}
