import { MigrationInterface, QueryRunner } from 'typeorm';

interface SectionContent {
  shared: Record<string, unknown>;
  translations: { vi?: Record<string, unknown>; en?: Record<string, unknown> };
}

interface SectionRow {
  id: string;
  draft_content: SectionContent;
  published_content: SectionContent | null;
}

// Copies today's shared "contact"/"social" settings into each page's own contact/offices
// section, so the homepage, /lien-he and /ve-chung-toi keep showing the same info after the
// frontend stops reading it from the shared settings and starts reading it from the page itself.
export class SeedPerPageContactData1790500000000 implements MigrationInterface {
  name = 'SeedPerPageContactData1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const office = (
      id: string,
      labelVi: string,
      labelEn: string,
      street: string,
      city: string,
      state: string | null,
      zip: string | null,
      country: string,
    ) => ({
      id,
      shared: { street, city, state, zip, country },
      label: { vi: labelVi, en: labelEn },
    });

    const offices = [
      office(
        'office-usa',
        'Houston, USA',
        'Houston, USA',
        '11419 Astoria Blvd',
        'Houston',
        'TX',
        '77089',
        'USA',
      ),
      office(
        'office-vn',
        'TP. Hồ Chí Minh, Việt Nam',
        'Ho Chi Minh City, Vietnam',
        '2/21 Thanh Xuan 24, Thoi An Ward',
        'Ho Chi Minh City',
        null,
        null,
        'Vietnam',
      ),
    ];
    const officeImageIds: Record<string, string> = {
      'office-usa': '30194ab2-eb75-4786-a8a4-9d413eaf16e4',
      'office-vn': '6a0b54eb-81df-44fb-9632-076c8f0bb518',
    };

    await this.mergeSection(queryRunner, '/', 'contact', {
      shared: { email: 'hello@khaifrost.vn', phone: '+84 96 123 4567' },
      translations: {
        vi: { address: 'Quận 9, TP. Hồ Chí Minh' },
        en: { address: 'District 9, Ho Chi Minh City, Vietnam' },
      },
    });

    await this.mergeSection(queryRunner, '/lien-he', 'contact-form', {
      shared: {
        email: 'hello@khaifrost.vn',
        phone: '+84 96 123 4567',
        offices: offices.map((o) => ({ id: o.id, ...o.shared })),
      },
      translations: {
        vi: { offices: Object.fromEntries(offices.map((o) => [o.id, { label: o.label.vi }])) },
        en: { offices: Object.fromEntries(offices.map((o) => [o.id, { label: o.label.en }])) },
      },
    });

    await this.mergeSection(queryRunner, '/ve-chung-toi', 'offices', {
      shared: {
        items: offices.map((o) => ({ id: o.id, ...o.shared, image: officeImageIds[o.id] })),
      },
      translations: {
        vi: { items: Object.fromEntries(offices.map((o) => [o.id, { label: o.label.vi }])) },
        en: { items: Object.fromEntries(offices.map((o) => [o.id, { label: o.label.en }])) },
      },
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.unmergeSection(queryRunner, '/', 'contact', ['email', 'phone'], ['address']);
    await this.unmergeSection(
      queryRunner,
      '/lien-he',
      'contact-form',
      ['email', 'phone', 'offices', 'socialLinks'],
      ['offices'],
    );
    await this.unmergeSection(queryRunner, '/ve-chung-toi', 'offices', ['items'], ['items']);
  }

  private async mergeSection(
    queryRunner: QueryRunner,
    path: string,
    sectionKey: string,
    patch: {
      shared: Record<string, unknown>;
      translations: Record<string, Record<string, unknown>>;
    },
  ): Promise<void> {
    const rows: SectionRow[] = await queryRunner.query(
      `SELECT ps.id, ps.draft_content, ps.published_content
       FROM page_sections ps JOIN pages p ON p.id = ps.page_id
       WHERE p.path = $1 AND ps.section_key = $2`,
      [path, sectionKey],
    );
    for (const row of rows) {
      const merge = (content: SectionContent | null): SectionContent | null => {
        if (!content) return content;
        return {
          shared: { ...content.shared, ...patch.shared },
          translations: {
            vi: { ...content.translations?.vi, ...patch.translations.vi },
            en: { ...content.translations?.en, ...patch.translations.en },
          },
        };
      };
      const draft = merge(row.draft_content);
      const published = merge(row.published_content);
      await queryRunner.query(
        `UPDATE page_sections SET draft_content = $1::jsonb, published_content = $2::jsonb WHERE id = $3`,
        [JSON.stringify(draft), published ? JSON.stringify(published) : null, row.id],
      );
    }
  }

  private async unmergeSection(
    queryRunner: QueryRunner,
    path: string,
    sectionKey: string,
    sharedKeys: string[],
    translatedKeys: string[],
  ): Promise<void> {
    const rows: SectionRow[] = await queryRunner.query(
      `SELECT ps.id, ps.draft_content, ps.published_content
       FROM page_sections ps JOIN pages p ON p.id = ps.page_id
       WHERE p.path = $1 AND ps.section_key = $2`,
      [path, sectionKey],
    );
    for (const row of rows) {
      const strip = (content: SectionContent | null): SectionContent | null => {
        if (!content) return content;
        const shared = { ...content.shared };
        for (const key of sharedKeys) delete shared[key];
        const vi = { ...content.translations?.vi };
        const en = { ...content.translations?.en };
        for (const key of translatedKeys) {
          delete vi[key];
          delete en[key];
        }
        return { shared, translations: { vi, en } };
      };
      const draft = strip(row.draft_content);
      const published = strip(row.published_content);
      await queryRunner.query(
        `UPDATE page_sections SET draft_content = $1::jsonb, published_content = $2::jsonb WHERE id = $3`,
        [JSON.stringify(draft), published ? JSON.stringify(published) : null, row.id],
      );
    }
  }
}
