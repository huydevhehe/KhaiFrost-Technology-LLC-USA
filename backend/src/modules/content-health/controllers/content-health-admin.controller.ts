import { Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ContentHealthResponseDto } from '../dto/content-health-response.dto';
import { ContentHealthService } from '../services/content-health.service';

@AdminController('content-health')
export class ContentHealthAdminController {
  constructor(private readonly health: ContentHealthService) {}

  @Get()
  @RequirePermissions(Permission.CONTENT_HEALTH_READ)
  @ApiOperation({ summary: 'Publishing checklist with actionable content issues' })
  @ApiOkResponse({ type: ContentHealthResponseDto })
  report(): Promise<ContentHealthResponseDto> {
    return this.health.getReport();
  }
}
