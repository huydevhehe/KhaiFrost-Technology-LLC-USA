import { Type } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BootstrapOwnerSettings } from '../../modules/users/seeds/bootstrap-owner.seed';
import type { FrontendContentLoader } from './support/frontend-content.loader';
import type { MediaResolver } from './support/media-resolver';

export interface SeedOptions {
  dryRun: boolean;
  // Names of the seeders to run; every seeder runs when empty
  only: readonly string[];
  // Root of the Next.js project the content is read from (read only)
  frontendDirectory: string;
  // Folder whose files are imported as media; defaults to <frontendDirectory>/public/images
  imagesDirectory: string;
  // Lets tests provide an owner without depending on the environment
  bootstrapOwner?: BootstrapOwnerSettings;
}

export interface SeederSummary {
  created: number;
  skipped: number;
  failed: number;
  notes: string[];
  errors: string[];
}

export interface SeederReport extends SeederSummary {
  name: string;
  durationMilliseconds: number;
}

export interface ServiceResolver {
  get<T>(token: Type<T> | string | symbol): T;
}

export interface SeedContext {
  options: SeedOptions;
  dataSource: DataSource;
  services: ServiceResolver;
  content: FrontendContentLoader;
  media: MediaResolver;
  // Set once the bootstrap-owner seeder (or an existing owner lookup) has finished
  owner: AuthenticatedUser | null;
}

export interface Seeder {
  readonly name: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
  run(context: SeedContext): Promise<SeederSummary>;
}

export function emptySummary(): SeederSummary {
  return { created: 0, skipped: 0, failed: 0, notes: [], errors: [] };
}
