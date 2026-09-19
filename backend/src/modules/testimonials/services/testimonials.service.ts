import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  forbidden,
  notFound,
  translationMissing,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  CreateTestimonialDto,
  TestimonialTranslationsDto,
  UpdateTestimonialDto,
} from '../dto/testimonial-input.dto';
import {
  ListTestimonialsQueryDto,
  PublicTestimonialsQueryDto,
  TESTIMONIAL_SORT_FIELDS,
} from '../dto/testimonial-queries.dto';
import {
  TestimonialAdminResponseDto,
  TestimonialPublicResponseDto,
} from '../dto/testimonial-response.dto';
import { TestimonialTranslation } from '../entities/testimonial-translation.entity';
import { Testimonial, TestimonialStatus } from '../entities/testimonial.entity';
import { toAdminTestimonial, toPublicTestimonial } from '../mappers/testimonial.mapper';

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly media: MediaReferenceService,
  ) {}

  async list(
    query: ListTestimonialsQueryDto,
  ): Promise<PaginatedResponseDto<TestimonialAdminResponseDto>> {
    const builder = this.dataSource.getRepository(Testimonial).createQueryBuilder('testimonial');
    if (query.status) builder.andWhere('testimonial.status = :status', { status: query.status });
    if (query.search) {
      builder.andWhere(
        '(testimonial.authorName ILIKE :pattern OR testimonial.company ILIKE :pattern)',
        { pattern: containsPattern(query.search) },
      );
    }
    const sort = resolveSort(query, TESTIMONIAL_SORT_FIELDS, 'sortOrder');
    builder
      .orderBy(`testimonial.${sort.field}`, sort.order)
      .addOrderBy('testimonial.createdAt', 'ASC');
    const page = await paginate(builder, query);
    const translations = await this.loadTranslations(page.items.map((item) => item.id));
    const urls = await this.media.resolveUrls(
      page.items.flatMap((item) => (item.avatarId ? [item.avatarId] : [])),
    );
    return new PaginatedResponseDto(
      page.items.map((item) =>
        toAdminTestimonial(
          item,
          translations.filter((row) => row.testimonialId === item.id),
          urls,
        ),
      ),
      page.meta,
    );
  }

  async getById(id: string): Promise<TestimonialAdminResponseDto> {
    const testimonial = await this.dataSource.getRepository(Testimonial).findOne({ where: { id } });
    if (!testimonial) throw notFound('Testimonial');
    const translations = await this.loadTranslations([id]);
    const urls = await this.media.resolveUrls(testimonial.avatarId ? [testimonial.avatarId] : []);
    return toAdminTestimonial(testimonial, translations, urls);
  }

  async create(
    dto: CreateTestimonialDto,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
  ): Promise<TestimonialAdminResponseDto> {
    const status = dto.status ?? TestimonialStatus.HIDDEN;
    if (
      status === TestimonialStatus.PUBLISHED &&
      !roleHasPermission(user.role, Permission.TESTIMONIAL_UPDATE)
    ) {
      throw forbidden('Only administrators can publish testimonials');
    }
    if (dto.avatarId) await this.media.assertAllExist([dto.avatarId]);
    const id = await this.dataSource.transaction(async (manager) => {
      const rows: { next: string }[] = await manager.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM testimonials WHERE deleted_at IS NULL',
      );
      const testimonial = await manager.save(
        manager.create(Testimonial, {
          authorName: dto.authorName,
          company: dto.company ?? null,
          location: dto.location ?? null,
          rating: dto.rating ?? 5,
          status,
          sortOrder: Number(rows[0]?.next ?? 0),
          avatarId: dto.avatarId ?? null,
        }),
      );
      await this.upsertTranslations(manager, testimonial.id, dto.translations);
      if (status === TestimonialStatus.PUBLISHED) {
        await this.assertPublishable(manager, testimonial.id);
      }
      return testimonial.id;
    });
    return this.getById(id);
  }

  async update(id: string, dto: UpdateTestimonialDto): Promise<TestimonialAdminResponseDto> {
    if (dto.avatarId) await this.media.assertAllExist([dto.avatarId]);
    await this.dataSource.transaction(async (manager) => {
      const testimonial = await manager.findOne(Testimonial, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!testimonial) throw notFound('Testimonial');
      assertVersionMatches(testimonial.version, dto.version);
      if (dto.authorName !== undefined) testimonial.authorName = dto.authorName;
      if (dto.company !== undefined) testimonial.company = dto.company ?? null;
      if (dto.location !== undefined) testimonial.location = dto.location ?? null;
      if (dto.rating !== undefined) testimonial.rating = dto.rating;
      if (dto.status !== undefined) testimonial.status = dto.status;
      if (dto.avatarId !== undefined) testimonial.avatarId = dto.avatarId ?? null;
      testimonial.updatedAt = new Date();
      await manager.save(testimonial);
      await this.upsertTranslations(manager, id, dto.translations);
      if (testimonial.status === TestimonialStatus.PUBLISHED) {
        await this.assertPublishable(manager, id);
      }
    });
    return this.getById(id);
  }

  async reorder(ids: string[]): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const all = await manager.find(Testimonial, {
        select: { id: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      const known = new Set(all.map((item) => item.id));
      const unknown = ids.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw validationFailed([
          { field: 'ids', messages: [`Unknown ids: ${unknown.join(', ')}`] },
        ]);
      }
      const requested = new Set(ids);
      const ordered = [...ids, ...all.map((item) => item.id).filter((id) => !requested.has(id))];
      for (const [index, id] of ordered.entries()) {
        await manager.update(Testimonial, { id }, { sortOrder: index });
      }
      return ordered;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.dataSource
      .getRepository(Testimonial)
      .softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw notFound('Testimonial');
  }

  async listPublic(
    query: PublicTestimonialsQueryDto,
  ): Promise<PaginatedResponseDto<TestimonialPublicResponseDto>> {
    const builder = this.dataSource
      .getRepository(Testimonial)
      .createQueryBuilder('testimonial')
      .where('testimonial.status = :status', { status: TestimonialStatus.PUBLISHED })
      .orderBy('testimonial.sortOrder', 'ASC')
      .addOrderBy('testimonial.createdAt', 'ASC');
    const page = await paginate(builder, query);
    const translations = await this.loadTranslations(
      page.items.map((item) => item.id),
      query.locale,
    );
    const urls = await this.media.resolveUrls(
      page.items.flatMap((item) => (item.avatarId ? [item.avatarId] : [])),
    );
    return new PaginatedResponseDto(
      page.items.map((item) =>
        toPublicTestimonial(
          item,
          translations.find((row) => row.testimonialId === item.id),
          urls,
        ),
      ),
      page.meta,
    );
  }

  private async loadTranslations(
    ids: string[],
    locale?: Locale,
  ): Promise<TestimonialTranslation[]> {
    if (ids.length === 0) return [];
    return this.dataSource.getRepository(TestimonialTranslation).find({
      where: locale ? { testimonialId: In(ids), locale } : { testimonialId: In(ids) },
    });
  }

  private async upsertTranslations(
    manager: EntityManager,
    testimonialId: string,
    input?: TestimonialTranslationsDto,
  ): Promise<void> {
    if (!input) return;
    for (const locale of SUPPORTED_LOCALES) {
      const values = input[locale];
      if (!values) continue;
      const row =
        (await manager.findOne(TestimonialTranslation, { where: { testimonialId, locale } })) ??
        manager.create(TestimonialTranslation, { testimonialId, locale });
      if (values.quote !== undefined) row.quote = values.quote ?? '';
      if (values.authorRole !== undefined) row.authorRole = values.authorRole ?? null;
      await manager.save(row);
    }
  }

  private async assertPublishable(manager: EntityManager, id: string): Promise<void> {
    const rows = await manager.find(TestimonialTranslation, { where: { testimonialId: id } });
    const missing = SUPPORTED_LOCALES.filter(
      (locale) => !rows.find((row) => row.locale === locale)?.quote.trim(),
    ).map((locale) => ({ locale, field: 'quote' }));
    if (missing.length > 0) throw translationMissing(missing);
  }
}
