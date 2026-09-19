import { HttpException } from '@nestjs/common';
import { emptySummary, SeedContext, SeederSummary } from '../seed.types';

export interface SeedWork {
  // True when the row is already there (soft deleted rows count, so removed content is never resurrected)
  exists: () => Promise<boolean>;
  create: () => Promise<unknown>;
  // Runs instead of create() in a dry run, to report invalid content without writing
  validate?: () => Promise<void> | void;
}

export function describeError(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse() as { code?: string; message?: string; details?: unknown };
    const details = response.details ? ` ${JSON.stringify(response.details)}` : '';
    return `${response.code ?? error.name}: ${response.message ?? error.message}${details}`;
  }
  return error instanceof Error ? error.message : String(error);
}

// Counts created / skipped / failed per item so one bad row never hides the others
export class SummaryBuilder {
  readonly summary: SeederSummary = emptySummary();

  constructor(private readonly context: SeedContext) {}

  get dryRun(): boolean {
    return this.context.options.dryRun;
  }

  note(message: string): void {
    this.summary.notes.push(message);
  }

  fail(label: string, error: unknown): void {
    this.summary.failed += 1;
    this.summary.errors.push(`${label}: ${describeError(error)}`);
  }

  skip(): void {
    this.summary.skipped += 1;
  }

  created(): void {
    this.summary.created += 1;
  }

  async item(label: string, work: SeedWork): Promise<boolean> {
    try {
      if (await work.exists()) {
        this.summary.skipped += 1;
        return false;
      }
      if (this.dryRun) await work.validate?.();
      else await work.create();
      this.summary.created += 1;
      return true;
    } catch (error) {
      this.fail(label, error);
      return false;
    }
  }

  // Missing media never blocks a seeder, but the gap is reported once
  reportUnresolvedMedia(): void {
    const missing = this.context.media.drainUnresolved();
    if (missing.length > 0) {
      this.note(`Media not found, left empty: ${missing.join(', ')}`);
    }
  }
}
