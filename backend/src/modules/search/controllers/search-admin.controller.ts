import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ResponseWithMeta } from '../../../common/dto/response-with-meta';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ThrottleAdminSearch } from '../constants/search.constants';
import { AdminSearchQueryDto } from '../dto/search-query.dto';
import { AdminSearchResultDto } from '../dto/search-response.dto';
import { AdminSearchService } from '../services/admin-search.service';

// Any staff role may search; each type is filtered by the read permission of the caller
@AdminController('search')
export class SearchAdminController {
  constructor(private readonly search: AdminSearchService) {}

  @Get()
  @ThrottleAdminSearch()
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Search content, contacts, people and media the caller may read' })
  @ApiOkResponse({ type: [AdminSearchResultDto] })
  find(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminSearchQueryDto,
  ): Promise<ResponseWithMeta<AdminSearchResultDto[], Record<string, unknown>>> {
    return this.search.search(user, query);
  }
}
