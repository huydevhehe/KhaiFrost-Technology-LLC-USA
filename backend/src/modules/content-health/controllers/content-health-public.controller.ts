import { Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { PublicContentHealthResponseDto } from '../dto/content-health-response.dto';
import { PublicContentHealthService } from '../services/public-content-health.service';

@PublicController('content-health')
export class ContentHealthPublicController {
  constructor(private readonly health: PublicContentHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Which content sections have published items (cached for 60 seconds)' })
  @ApiOkResponse({ type: PublicContentHealthResponseDto })
  flags(): Promise<PublicContentHealthResponseDto> {
    return this.health.getFlags();
  }
}
