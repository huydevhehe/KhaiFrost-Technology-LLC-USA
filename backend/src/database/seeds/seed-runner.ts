import { join, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { RequestContextService } from '../../common/context/request-context.service';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BACKEND_ROOT } from '../../config/backend-root';
import { User } from '../../modules/users/entities/user.entity';
import { SEEDER_NAMES } from './seed-content-mapping';
import { createSeeders } from './seeders';
import {
  emptySummary,
  SeedContext,
  SeederReport,
  SeedOptions,
  Seeder,
  ServiceResolver,
} from './seed.types';
import { FrontendContentLoader } from './support/frontend-content.loader';
import { DRY_RUN_PLACEHOLDER_ID, MediaResolver } from './support/media-resolver';
import { describeError } from './support/summary-builder';

export interface SeedRunReport {
  dryRun: boolean;
  seeders: SeederReport[];
  failed: number;
}

export function resolveSeedOptions(partial: Partial<SeedOptions> = {}): SeedOptions {
  const frontendDirectory = partial.frontendDirectory ?? resolve(BACKEND_ROOT, '..', 'frontend');
  return {
    dryRun: partial.dryRun ?? false,
    only: partial.only ?? [],
    frontendDirectory,
    imagesDirectory: partial.imagesDirectory ?? join(frontendDirectory, 'public', 'images'),
    bootstrapOwner: partial.bootstrapOwner,
  };
}

function toOwnerUser(id: string): AuthenticatedUser {
  return { id, role: Role.OWNER, sessionId: 'seed', adminSessionActive: true, mustChangePassword: false };
}

async function findOwner(
  dataSource: DataSource,
  dryRun: boolean,
): Promise<AuthenticatedUser | null> {
  const owner = await dataSource
    .getRepository(User)
    .findOne({ where: { role: Role.OWNER }, order: { createdAt: 'ASC' } });
  if (owner) return toOwnerUser(owner.id);
  return dryRun ? toOwnerUser(DRY_RUN_PLACEHOLDER_ID) : null;
}

// Runs the seeders in their fixed order; each one is attributed to the owner account
export async function runSeeds(
  services: ServiceResolver,
  partialOptions: Partial<SeedOptions> = {},
  onProgress: (message: string) => void = () => undefined,
  seeders: Seeder[] = createSeeders(),
): Promise<SeedRunReport> {
  const options = resolveSeedOptions(partialOptions);
  const unknown = options.only.filter(
    (name) => !(SEEDER_NAMES as readonly string[]).includes(name),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown seeder(s): ${unknown.join(', ')}. Available: ${SEEDER_NAMES.join(', ')}`,
    );
  }

  const dataSource = services.get(DataSource);
  const requestContext = services.get(RequestContextService);
  const context: SeedContext = {
    options,
    dataSource,
    services,
    content: new FrontendContentLoader(options.frontendDirectory),
    media: new MediaResolver(dataSource, options.imagesDirectory, options.dryRun),
    owner: null,
  };

  const selected = seeders.filter(
    (seeder) => options.only.length === 0 || options.only.includes(seeder.name),
  );
  const reports: SeederReport[] = [];

  for (const seeder of selected) {
    const started = Date.now();
    onProgress(`running ${seeder.name}${options.dryRun ? ' (dry run)' : ''}`);
    let summary = emptySummary();
    try {
      if (seeder.name !== 'bootstrap-owner' && !context.owner) {
        context.owner = await findOwner(dataSource, options.dryRun);
        if (!context.owner)
          throw new Error('No owner account exists; run the bootstrap-owner seeder first');
      }
      summary = await requestContext.runAs(context.owner?.id, () => seeder.run(context));
      if (seeder.name === 'bootstrap-owner') {
        context.owner = await findOwner(dataSource, options.dryRun);
      }
    } catch (error) {
      summary.failed += 1;
      summary.errors.push(describeError(error));
    }
    const missingDependencies = seeder.dependsOn.filter(
      (dependency) => options.only.length > 0 && !selected.some((item) => item.name === dependency),
    );
    if (missingDependencies.length > 0) {
      summary.notes.push(
        `Not selected, relying on existing data of: ${missingDependencies.join(', ')}`,
      );
    }
    reports.push({ name: seeder.name, ...summary, durationMilliseconds: Date.now() - started });
    if (seeder.name === 'bootstrap-owner' && !context.owner) break;
  }

  return {
    dryRun: options.dryRun,
    seeders: reports,
    failed: reports.reduce((total, report) => total + report.failed, 0),
  };
}

export function formatReport(report: SeedRunReport): string {
  const lines = [report.dryRun ? 'Seed report (dry run, nothing was written)' : 'Seed report', ''];
  const nameWidth = Math.max(...report.seeders.map((item) => item.name.length), 8);
  for (const item of report.seeders) {
    lines.push(
      `${item.name.padEnd(nameWidth)}  created ${String(item.created).padStart(4)}  skipped ${String(item.skipped).padStart(4)}  failed ${String(item.failed).padStart(3)}  (${item.durationMilliseconds} ms)`,
    );
    for (const note of item.notes) lines.push(`    note: ${note}`);
    for (const error of item.errors) lines.push(`    ERROR: ${error}`);
  }
  lines.push(
    '',
    report.failed === 0 ? 'Done, no failures.' : `Finished with ${report.failed} failure(s).`,
  );
  return lines.join('\n');
}
