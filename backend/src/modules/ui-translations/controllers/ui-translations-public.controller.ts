import { Get, Param, ParseEnumPipe, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { SkipResponseEnvelope } from '../../../common/decorators/skip-response-envelope.decorator';
import { Locale } from '../../../common/enums/locale.enum';
import { UI_TRANSLATION_NAMESPACE_PATTERN } from '../dto/create-ui-translation.dto';
import {
  RenderedBundle,
  UiTranslationBundleService,
} from '../services/ui-translation-bundle.service';
import { badRequest } from '../../../common/exceptions/exception.factories';
import { ErrorCode } from '../../../common/constants/error-codes';

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

@PublicController('ui-translations')
export class UiTranslationsPublicController {
  constructor(private readonly bundles: UiTranslationBundleService) {}

  @Get(':locale')
  @SkipResponseEnvelope()
  @ApiOperation({
    summary: 'i18next resource bundle for a locale',
    description:
      'Returns { namespace: { nested: { key: text } } } WITHOUT the usual { data } envelope so i18next can consume it directly. ' +
      'Sends ETag and Cache-Control; a matching If-None-Match yields 304.',
  })
  @ApiParam({ name: 'locale', enum: Locale })
  @ApiProduces('application/json')
  async getLocaleBundle(
    @Param('locale', new ParseEnumPipe(Locale)) locale: Locale,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    return this.send(response, await this.bundles.buildLocaleBundle(locale));
  }

  @Get(':locale/:namespace')
  @SkipResponseEnvelope()
  @ApiOperation({
    summary: 'i18next bundle of a single namespace (for HTTP backends)',
    description:
      'Returns the nested keys of one namespace WITHOUT the { data } envelope. Sends ETag and Cache-Control.',
  })
  @ApiParam({ name: 'locale', enum: Locale })
  @ApiProduces('application/json')
  async getNamespaceBundle(
    @Param('locale', new ParseEnumPipe(Locale)) locale: Locale,
    @Param('namespace') namespace: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    if (namespace.length > 60 || !UI_TRANSLATION_NAMESPACE_PATTERN.test(namespace)) {
      throw badRequest(ErrorCode.BAD_REQUEST, 'Invalid namespace');
    }
    return this.send(response, await this.bundles.buildNamespaceBundle(locale, namespace));
  }

  // Express turns a matching If-None-Match into 304 automatically once ETag is set
  private send(response: Response, rendered: RenderedBundle): unknown {
    response.setHeader('ETag', rendered.etag);
    response.setHeader('Cache-Control', CACHE_CONTROL);
    return rendered.body;
  }
}
