import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { CreateUiTranslationDto } from '../dto/create-ui-translation.dto';
import {
  ImportResourceBundleDto,
  ImportResourceBundleResultDto,
} from '../dto/import-resource-bundle.dto';
import {
  ListMissingUiTranslationsQueryDto,
  ListUiTranslationsQueryDto,
} from '../dto/list-ui-translations-query.dto';
import { UpdateUiTranslationDto } from '../dto/update-ui-translation.dto';
import {
  UiTranslationNamespaceSummaryDto,
  UiTranslationResponseDto,
} from '../dto/ui-translation-response.dto';
import { UiTranslationsService } from '../services/ui-translations.service';

@AdminController('ui-translations')
export class UiTranslationsAdminController {
  constructor(private readonly translations: UiTranslationsService) {}

  @Get()
  @RequirePermissions(Permission.UI_TRANSLATION_READ)
  @ApiOperation({ summary: 'List website texts with search, namespace and missing filters' })
  list(
    @Query() query: ListUiTranslationsQueryDto,
  ): Promise<PaginatedResponseDto<UiTranslationResponseDto>> {
    return this.translations.list(query);
  }

  @Get('missing')
  @RequirePermissions(Permission.UI_TRANSLATION_READ)
  @ApiOperation({ summary: 'List texts that are still empty in vi or en' })
  listMissing(
    @Query() query: ListMissingUiTranslationsQueryDto,
  ): Promise<PaginatedResponseDto<UiTranslationResponseDto>> {
    return this.translations.listMissing(query);
  }

  @Get('namespaces')
  @RequirePermissions(Permission.UI_TRANSLATION_READ)
  @ApiOperation({ summary: 'Namespaces with total and missing counts' })
  listNamespaces(): Promise<UiTranslationNamespaceSummaryDto[]> {
    return this.translations.listNamespaces();
  }

  @Get(':id')
  @RequirePermissions(Permission.UI_TRANSLATION_READ)
  @ApiOperation({ summary: 'Get one website text' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UiTranslationResponseDto> {
    return this.translations.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.UI_TRANSLATION_UPDATE)
  @AuditAction('ui-translation.created', 'UiTranslation')
  @ApiOperation({ summary: 'Create a website text (placeholders must match in vi and en)' })
  create(@Body() dto: CreateUiTranslationDto): Promise<UiTranslationResponseDto> {
    return this.translations.create(dto);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.UI_TRANSLATION_UPDATE)
  @AuditAction('ui-translation.imported', 'UiTranslation')
  @ApiOperation({ summary: 'Import a nested i18next JSON file for one locale and namespace' })
  import(@Body() dto: ImportResourceBundleDto): Promise<ImportResourceBundleResultDto> {
    return this.translations.importResourceBundle(dto.locale, dto.bundle, {
      namespace: dto.namespace,
      overwrite: dto.overwrite ?? false,
    });
  }

  @Patch(':id')
  @RequirePermissions(Permission.UI_TRANSLATION_UPDATE)
  @AuditAction('ui-translation.updated', 'UiTranslation')
  @ApiOperation({ summary: 'Update the texts or description of a website text' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUiTranslationDto,
  ): Promise<UiTranslationResponseDto> {
    return this.translations.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.UI_TRANSLATION_UPDATE)
  @AuditAction('ui-translation.deleted', 'UiTranslation')
  @ApiOperation({ summary: 'Delete a custom website text (system texts are protected)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.translations.remove(id);
  }
}
