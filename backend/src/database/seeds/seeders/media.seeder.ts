import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { extname, relative, sep } from 'node:path';
import { ConfigType } from '@nestjs/config';
import { storageConfig } from '../../../config/storage.config';
import { MediaErrorCode } from '../../../modules/media/constants/media.constants';
import { MediaAsset } from '../../../modules/media/entities/media-asset.entity';
import { MediaService } from '../../../modules/media/services/media.service';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { listFiles } from '../support/list-files';
import { deriveAltText, deriveFolder } from '../support/media-alt-text';
import { describeError, SummaryBuilder } from '../support/summary-builder';

const PUBLIC_IMAGE_PREFIX = '/images/';
// Rejections that mean "this file cannot be a media asset", not "something broke"
const SKIPPABLE_REJECTIONS: readonly string[] = [
  MediaErrorCode.TOO_LARGE,
  MediaErrorCode.UNSUPPORTED_TYPE,
];

// The real check reads the file signature; in a dry run the extension has to do
const DRY_RUN_SUPPORTED_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
  '.pdf',
];

export class MediaSeeder implements Seeder {
  readonly name = 'media';
  readonly description = 'Imports every file under public/images through the media pipeline';
  readonly dependsOn: readonly string[] = ['bootstrap-owner'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const root = context.options.imagesDirectory;
    let files: string[];
    try {
      files = listFiles(root);
    } catch (error) {
      builder.fail(root, error);
      return builder.summary;
    }

    const service = context.services.get(MediaService);
    const maxBytes = context.services.get<ConfigType<typeof storageConfig>>(
      storageConfig.KEY,
    ).maxFileSizeBytes;
    const notImported: string[] = [];

    for (const absolute of files) {
      const relativePath = relative(root, absolute).split(sep).join('/');
      const publicPath = `${PUBLIC_IMAGE_PREFIX}${relativePath}`;
      try {
        if (context.options.dryRun) {
          await this.dryRun(context, builder, absolute, publicPath, maxBytes, notImported);
          continue;
        }
        const result = await service.importFromLocalFile(absolute, {
          folder: deriveFolder(relativePath),
          altText: deriveAltText(relativePath),
          createdById: context.owner?.id ?? null,
        });
        if (result.status === 'rejected') {
          const code = result.error?.code ?? '';
          if (SKIPPABLE_REJECTIONS.includes(code)) {
            builder.skip();
            notImported.push(`${publicPath} (${code})`);
          } else builder.fail(publicPath, `${code}: ${result.error?.message}`);
          continue;
        }
        if (result.asset) context.media.register(publicPath, result.asset.id);
        if (result.status === 'created') builder.created();
        else builder.skip();
      } catch (error) {
        builder.fail(publicPath, describeError(error));
      }
    }

    if (notImported.length > 0) {
      builder.note(
        `Not imported (unsupported type or larger than the limit): ${notImported.join(', ')}`,
      );
    }
    return builder.summary;
  }

  private async dryRun(
    context: SeedContext,
    builder: SummaryBuilder,
    absolute: string,
    publicPath: string,
    maxBytes: number,
    notImported: string[],
  ): Promise<void> {
    if (!DRY_RUN_SUPPORTED_EXTENSIONS.includes(extname(absolute).toLowerCase())) {
      builder.skip();
      notImported.push(`${publicPath} (${MediaErrorCode.UNSUPPORTED_TYPE})`);
      return;
    }
    if (statSync(absolute).size > maxBytes) {
      builder.skip();
      notImported.push(`${publicPath} (${MediaErrorCode.TOO_LARGE})`);
      return;
    }
    const checksum = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    const existing = await context.dataSource
      .getRepository(MediaAsset)
      .findOne({ select: { id: true }, where: { checksumSha256: checksum } });
    if (existing) {
      context.media.register(publicPath, existing.id);
      builder.skip();
    } else builder.created();
  }
}
