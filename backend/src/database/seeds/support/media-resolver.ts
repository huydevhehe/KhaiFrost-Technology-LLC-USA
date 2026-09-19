import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { DataSource } from 'typeorm';
import { listFiles } from './list-files';
import { MediaAsset } from '../../../modules/media/entities/media-asset.entity';

const PUBLIC_IMAGE_PREFIX = '/images/';
// Only used to validate payloads in a dry run, never written anywhere
export const DRY_RUN_PLACEHOLDER_ID = '00000000-0000-4000-8000-000000000000';

// Resolves references such as "/images/about/hero.jpg" to media asset ids.
// The media importer dedupes on the sha256 of the original bytes, so a file that was imported by an earlier
// run (or by the media seeder in this run) is found again by its checksum.
export class MediaResolver {
  private readonly ids = new Map<string, string>();
  private readonly unresolved = new Set<string>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly imagesDirectory: string,
    private readonly dryRun: boolean,
  ) {}

  register(publicPath: string, assetId: string): void {
    this.ids.set(publicPath, assetId);
  }

  // Every public path (/images/...) that exists in the images directory
  listPublicPaths(): string[] {
    if (!existsSync(this.imagesDirectory)) return [];
    return listFiles(this.imagesDirectory).map(
      (file) =>
        `${PUBLIC_IMAGE_PREFIX}${relative(this.imagesDirectory, file).split(sep).join('/')}`,
    );
  }

  localFileOf(publicPath: string): string | null {
    if (!publicPath.startsWith(PUBLIC_IMAGE_PREFIX)) return null;
    const file = join(this.imagesDirectory, publicPath.slice(PUBLIC_IMAGE_PREFIX.length));
    return existsSync(file) && statSync(file).isFile() ? file : null;
  }

  async idFor(publicPath: string | null | undefined): Promise<string | null> {
    if (!publicPath) return null;
    const known = this.ids.get(publicPath);
    if (known) return known;

    const file = this.localFileOf(publicPath);
    if (file) {
      const checksum = createHash('sha256').update(readFileSync(file)).digest('hex');
      const asset = await this.dataSource
        .getRepository(MediaAsset)
        .findOne({ select: { id: true }, where: { checksumSha256: checksum } });
      if (asset) {
        this.ids.set(publicPath, asset.id);
        return asset.id;
      }
      if (this.dryRun) return DRY_RUN_PLACEHOLDER_ID;
    }
    this.unresolved.add(publicPath);
    return null;
  }

  // Returns the references that could not be resolved since the last call
  drainUnresolved(): string[] {
    const missing = [...this.unresolved].sort();
    this.unresolved.clear();
    return missing;
  }

  async idsFor(publicPaths: readonly string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const path of publicPaths) {
      const id = await this.idFor(path);
      if (id) ids.push(id);
    }
    return ids;
  }
}
