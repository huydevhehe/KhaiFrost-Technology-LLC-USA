import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { SkipResponseEnvelope } from '../../common/decorators/skip-response-envelope.decorator';

@ApiTags('health')
@Controller('health')
@Public()
@SkipThrottle()
@SkipResponseEnvelope()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
