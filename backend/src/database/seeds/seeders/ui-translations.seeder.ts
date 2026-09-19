import { Locale } from '../../../common/enums/locale.enum';
import { UiTranslation } from '../../../modules/ui-translations/entities/ui-translation.entity';
import {
  DEFAULT_UI_NAMESPACE,
  UiTranslationsService,
} from '../../../modules/ui-translations/services/ui-translations.service';
import { flattenResourceBundle } from '../../../modules/ui-translations/utils/resource-bundle';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SummaryBuilder } from '../support/summary-builder';

const LOCALES = [Locale.VI, Locale.EN] as const;

export class UiTranslationsSeeder implements Seeder {
  readonly name = 'ui-translations';
  readonly description =
    'Imports the i18n JSON bundles as system UI translations (never overwrites)';
  readonly dependsOn: readonly string[] = [];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const service = context.services.get(UiTranslationsService);
    const rows = context.dataSource.getRepository(UiTranslation);

    for (const locale of LOCALES) {
      const bundle = context.content.uiBundle(locale);
      try {
        if (context.options.dryRun) {
          const flat = flattenResourceBundle(bundle);
          const existing = new Set(
            (await rows.find({ where: { namespace: DEFAULT_UI_NAMESPACE } })).map((row) => row.key),
          );
          const missing = Object.keys(flat).filter((key) => !existing.has(key)).length;
          builder.summary.created += locale === Locale.VI ? missing : 0;
          builder.summary.skipped += Object.keys(flat).length - missing;
          continue;
        }
        const result = await service.importResourceBundle(locale, bundle, {
          markAsSystem: true,
          overwrite: false,
        });
        // Keys are counted once: the first locale creates them, the second only fills its own column
        builder.summary.created += result.created;
        builder.summary.skipped += result.skipped;
        if (result.updated > 0) builder.note(`${locale}: filled ${result.updated} existing keys`);
        for (const key of result.conflicts)
          builder.fail(`${locale}:${key}`, 'key clashes with an existing key');
        if (result.placeholderMismatches.length > 0) {
          builder.note(
            `${locale}: placeholder mismatch in ${result.placeholderMismatches.join(', ')}`,
          );
        }
      } catch (error) {
        builder.fail(`bundle ${locale}`, error);
      }
    }
    return builder.summary;
  }
}
