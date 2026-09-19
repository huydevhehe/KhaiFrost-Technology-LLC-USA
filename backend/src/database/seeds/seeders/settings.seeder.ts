import { Locale } from '../../../common/enums/locale.enum';
import { SettingGroup } from '../../../modules/settings/constants/setting-group';
import { SettingsService } from '../../../modules/settings/services/settings.service';
import { PAGE_SEO_ENGLISH } from '../seed-generated-content';
import { SOCIAL_NETWORK_BY_LABEL } from '../seed-content-mapping';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SummaryBuilder } from '../support/summary-builder';

export class SettingsSeeder implements Seeder {
  readonly name = 'settings';
  readonly description =
    'Company, contact, social, branding, localization and SEO default settings';
  readonly dependsOn: readonly string[] = ['media'];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const service = context.services.get(SettingsService);

    const groups: { group: SettingGroup; value: () => Promise<Record<string, unknown>> }[] = [
      { group: SettingGroup.COMPANY, value: async () => this.company(context) },
      { group: SettingGroup.CONTACT, value: () => this.contact(context) },
      { group: SettingGroup.SOCIAL, value: async () => this.social(context, builder) },
      { group: SettingGroup.BRANDING, value: () => this.branding(context, builder) },
      {
        group: SettingGroup.LOCALIZATION,
        value: async () => ({ defaultLocale: Locale.VI, enabledLocales: [Locale.VI, Locale.EN] }),
      },
      { group: SettingGroup.SEO_DEFAULTS, value: () => this.seoDefaults(context) },
    ];

    for (const { group, value } of groups) {
      await builder.item(`setting ${group}`, {
        exists: async () => !(await service.getAdmin(group)).isDefault,
        create: async () => service.update(group, { version: 0, value: await value() }),
        validate: async () => {
          await value();
        },
      });
    }
    builder.reportUnresolvedMedia();
    return builder.summary;
  }

  private company(context: SeedContext): Record<string, unknown> {
    const company = context.content.companySettings();
    // The admin mock keeps one address string; it only holds proper nouns, so both languages get it
    return {
      companyName: company.companyName,
      email: company.email,
      phone: company.phone,
      address: { vi: company.address, en: company.address },
      website: company.website,
    };
  }

  private async contact(context: SeedContext): Promise<Record<string, unknown>> {
    const site = context.content.siteConfig();
    const officeImages = context.content.aboutOfficeImages();
    const offices = [];
    for (const office of site.offices) {
      offices.push({
        id: office.id,
        label: office.label,
        street: office.street,
        city: office.city,
        state: office.state ?? null,
        zip: office.zip || null,
        country: office.country,
        countryCode: office.countryCode,
        mapX: office.x,
        mapY: office.y,
        imageId: await context.media.idFor(officeImages[office.id]),
      });
    }
    const hours = context.content.text('contactPage.availability.hoursDesc');
    return {
      channels: [
        { type: 'email', value: site.email, label: { vi: 'Email', en: 'Email' } },
        { type: 'phone', value: site.phone, label: { vi: 'Điện thoại', en: 'Phone' } },
      ],
      businessHours: hours,
      offices,
    };
  }

  private social(context: SeedContext, builder: SummaryBuilder): Record<string, unknown> {
    const links: { network: string; url: string }[] = [];
    for (const link of context.content.siteConfig().socialLinks) {
      const network = SOCIAL_NETWORK_BY_LABEL[link.label];
      if (network && /^https?:\/\//.test(link.href)) links.push({ network, url: link.href });
    }
    if (links.length === 0) {
      builder.note(
        'Social links left empty: the frontend only has "#" placeholders; add real profiles in admin settings',
      );
    }
    return { links };
  }

  private async branding(
    context: SeedContext,
    builder: SummaryBuilder,
  ): Promise<Record<string, unknown>> {
    const value: Record<string, unknown> = { brandColor: '#0B1120' };
    const logo = await this.findBrandFile(context, 'logo');
    const favicon = await this.findBrandFile(context, 'favicon');
    if (logo) value.logoId = logo;
    if (favicon) value.faviconId = favicon;
    if (!logo || !favicon) {
      builder.note('Branding: no logo/favicon image under public/images, left empty');
    }
    return value;
  }

  private async findBrandFile(
    context: SeedContext,
    kind: 'logo' | 'favicon',
  ): Promise<string | null> {
    const pattern = new RegExp(`/${kind}[^/]*\\.(png|jpe?g|webp|avif|gif)$`, 'i');
    const candidate = context.media.listPublicPaths().find((path) => pattern.test(path));
    return candidate ? context.media.idFor(candidate) : null;
  }

  private async seoDefaults(context: SeedContext): Promise<Record<string, unknown>> {
    const home = context.content.seoSettings().find((entry) => entry.pageId === 'trang-chu');
    if (!home) throw new Error('mockSeo.ts has no "trang-chu" entry');
    const english = PAGE_SEO_ENGLISH['trang-chu'];
    const [siteName] = home.title.split('|').map((part) => part.trim());
    return {
      siteName,
      titleTemplate: '%s | KhaiFrost Technology LLC',
      defaultDescription: { vi: home.metaDescription, en: english.description },
      defaultOgImageId: await context.media.idFor(home.ogImage),
    };
  }
}
