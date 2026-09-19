import { Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { SettingsService } from '../services/settings.service';

@PublicController('settings')
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Public site settings in one locale',
    description:
      'Keys: company, branding, social, contact, localization, seoDefaults. Media are resolved to urls.',
  })
  get(@Query() query: LocaleQueryDto): Promise<Record<string, unknown>> {
    return this.settings.getPublic(query.locale);
  }
}
