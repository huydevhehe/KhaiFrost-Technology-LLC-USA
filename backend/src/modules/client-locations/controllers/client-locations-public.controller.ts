import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import {
  ClientLocationPublicResponseDto,
  PublicClientLocationsQueryDto,
} from '../dto/client-location.dto';
import { ClientLocationsService } from '../services/client-locations.service';

@PublicController('client-locations')
export class ClientLocationsPublicController {
  constructor(private readonly locations: ClientLocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Published client locations for the world map' })
  @ApiOkResponse({ type: [ClientLocationPublicResponseDto] })
  list(
    @Query() query: PublicClientLocationsQueryDto,
  ): Promise<PaginatedResponseDto<ClientLocationPublicResponseDto>> {
    return this.locations.listPublic(query);
  }
}
