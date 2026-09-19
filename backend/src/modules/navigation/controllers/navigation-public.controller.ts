import { Get, Param, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PublicNavigationMenuDto } from '../dto/navigation-response.dto';
import { NavigationService } from '../services/navigation.service';

@PublicController('navigation')
export class NavigationPublicController {
  constructor(private readonly navigation: NavigationService) {}

  @Get(':menuKey')
  @ApiOperation({
    summary: 'Resolved menu tree for one locale',
    description:
      'Page links resolve to the page path; hidden items and unpublished pages are omitted.',
  })
  get(
    @Param('menuKey') menuKey: string,
    @Query() query: LocaleQueryDto,
  ): Promise<PublicNavigationMenuDto> {
    return this.navigation.getPublicMenu(menuKey, query.locale);
  }
}
