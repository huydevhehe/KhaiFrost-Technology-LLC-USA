import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { loadDotenv } from '../../config/load-dotenv';
import { formatReport, runSeeds } from './seed-runner';
import { SeedOptions } from './seed.types';

interface CliArguments {
  options: Partial<SeedOptions>;
  forceProduction: boolean;
}

function parseArguments(argv: string[]): CliArguments {
  const options: Partial<SeedOptions> = { only: [], dryRun: false };
  let forceProduction = false;
  for (const argument of argv) {
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--force-production') forceProduction = true;
    else if (argument.startsWith('--only=')) {
      options.only = argument
        .slice('--only='.length)
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    } else if (argument.startsWith('--frontend-dir=')) {
      options.frontendDirectory = argument.slice('--frontend-dir='.length);
    } else if (argument.startsWith('--images-dir=')) {
      options.imagesDirectory = argument.slice('--images-dir='.length);
    } else {
      throw new Error(
        `Unknown argument "${argument}". Supported: --only=<name,...> --dry-run --force-production --frontend-dir=<path> --images-dir=<path>`,
      );
    }
  }
  return { options, forceProduction };
}

async function main(): Promise<void> {
  const { options, forceProduction } = parseArguments(process.argv.slice(2));
  loadDotenv();
  if (process.env.NODE_ENV === 'production' && !forceProduction) {
    throw new Error(
      'Refusing to seed with NODE_ENV=production; pass --force-production to override',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const report = await runSeeds(
      { get: (token) => app.get(token, { strict: false }) },
      options,
      (message) => console.log(message),
    );
    console.log(`\n${formatReport(report)}`);
    process.exitCode = report.failed === 0 ? 0 : 1;
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
