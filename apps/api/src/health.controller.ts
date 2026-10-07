import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@reservaya/shared';

@Controller()
export class HealthController {
  @Get('health')
  health(): HealthResponse {
    return { ok: true };
  }
}
