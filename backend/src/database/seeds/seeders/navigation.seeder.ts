import { validationFailed } from '../../../common/exceptions/exception.factories';
import { NavigationLinkType } from '../../../modules/navigation/constants/navigation-link-type';
import { NavigationItemInputDto } from '../../../modules/navigation/dto/replace-navigation.dto';
import { NavigationService } from '../../../modules/navigation/services/navigation.service';
import { flattenNavigationTree } from '../../../modules/navigation/utils/navigation-tree';
import { NAVIGATION_MENUS, SOURCE_NAV_LABEL_KEY } from '../seed-content-mapping';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SourceLocalizedText } from '../support/source-content.types';
import { SummaryBuilder } from '../support/summary-builder';

function pathItem(label: SourceLocalizedText, url: string): NavigationItemInputDto {
  return {
    linkType: NavigationLinkType.PATH,
    url,
    translations: { vi: { label: label.vi }, en: { label: label.en } },
  };
}

function heading(
  label: SourceLocalizedText,
  children: NavigationItemInputDto[],
): NavigationItemInputDto {
  return {
    linkType: NavigationLinkType.NONE,
    translations: { vi: { label: label.vi }, en: { label: label.en } },
    children,
  };
}

export class NavigationSeeder implements Seeder {
  readonly name = 'navigation';
  readonly description =
    'Header and footer menus (path links, so they do not depend on the pages seeder)';
  readonly dependsOn: readonly string[] = [];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const service = context.services.get(NavigationService);
    const menus: Record<string, NavigationItemInputDto[]> = {
      [NAVIGATION_MENUS.header]: this.header(context),
      [NAVIGATION_MENUS.footer]: this.footer(context),
    };

    for (const [key, items] of Object.entries(menus)) {
      await builder.item(`menu ${key}`, {
        exists: async () => (await service.getAdminMenu(key)).version > 0,
        create: () => service.replaceMenu(key, { version: 0, items }),
        validate: () => {
          const { errors } = flattenNavigationTree(items);
          if (errors.length > 0) throw validationFailed(errors);
        },
      });
    }
    return builder.summary;
  }

  private header(context: SeedContext): NavigationItemInputDto[] {
    return context.content
      .navLinks()
      .map((link) => pathItem(context.content.text(SOURCE_NAV_LABEL_KEY(link.key)), link.href));
  }

  private footer(context: SeedContext): NavigationItemInputDto[] {
    const content = context.content;
    return [
      heading(
        content.text('footer.quickLinks'),
        content
          .navLinks()
          .map((link) => pathItem(content.text(SOURCE_NAV_LABEL_KEY(link.key)), link.href)),
      ),
      heading(
        content.text('footer.ourServices'),
        content.services().map((service) => pathItem(service.title, `/dich-vu/${service.slug}`)),
      ),
      heading(content.text('footer.contactUs'), [
        pathItem(content.text('nav.contact'), '/lien-he'),
      ]),
    ];
  }
}
