import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { validationFailed } from '../../../common/exceptions/exception.factories';
import { ServiceProductLinkType } from '../constants/service-product-link-type';
import { CollectionItemRecord } from './collection-definition';

interface ProductLinkInput {
  linkType: ServiceProductLinkType;
  linkProductId?: string | null;
  linkPostId?: string | null;
}

interface IdSlugRow {
  id: string;
  slug: string;
}

// Resolves the "Sản phẩm" collection's linkProductId/linkPostId into real hrefs, and
// validates on save that a picked product/post still exists. Uses raw SQL against the
// products/posts tables rather than their TypeORM entities, so this module never has to
// pull in the whole Products/Posts entity graph (categories, translations, prices...).
@Injectable()
export class ProductLinkResolverService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async assertLinksExist(inputs: ProductLinkInput[]): Promise<void> {
    const productIds = [
      ...new Set(
        inputs
          .filter((i) => i.linkType === ServiceProductLinkType.PRODUCT && i.linkProductId)
          .map((i) => i.linkProductId as string),
      ),
    ];
    const postIds = [
      ...new Set(
        inputs
          .filter((i) => i.linkType === ServiceProductLinkType.POST && i.linkPostId)
          .map((i) => i.linkPostId as string),
      ),
    ];

    const errors: { field: string; messages: string[] }[] = [];
    if (productIds.length > 0) {
      const foundIds = new Set((await this.existingIds('products', productIds)).map((row) => row.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        errors.push({
          field: 'products.linkProductId',
          messages: [`Unknown products: ${missing.join(', ')}`],
        });
      }
    }
    if (postIds.length > 0) {
      const foundIds = new Set((await this.existingIds('posts', postIds)).map((row) => row.id));
      const missing = postIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        errors.push({
          field: 'products.linkPostId',
          messages: [`Unknown posts: ${missing.join(', ')}`],
        });
      }
    }
    if (errors.length > 0) throw validationFailed(errors);
  }

  async resolveHrefs(records: CollectionItemRecord[]): Promise<Map<string, string>> {
    const hrefs = new Map<string, string>();

    const productIds = [
      ...new Set(
        records
          .filter((r) => r.fields.linkType === ServiceProductLinkType.PRODUCT && r.fields.linkProductId)
          .map((r) => r.fields.linkProductId as string),
      ),
    ];
    if (productIds.length > 0) {
      const slugById = new Map(
        (await this.existingIds('products', productIds)).map((row) => [row.id, row.slug]),
      );
      for (const record of records) {
        if (record.fields.linkType !== ServiceProductLinkType.PRODUCT) continue;
        const slug = slugById.get(record.fields.linkProductId as string);
        if (slug) hrefs.set(record.id, `/san-pham/${slug}`);
      }
    }

    const postIds = [
      ...new Set(
        records
          .filter((r) => r.fields.linkType === ServiceProductLinkType.POST && r.fields.linkPostId)
          .map((r) => r.fields.linkPostId as string),
      ),
    ];
    if (postIds.length > 0) {
      const slugById = new Map(
        (await this.existingIds('posts', postIds)).map((row) => [row.id, row.slug]),
      );
      for (const record of records) {
        if (record.fields.linkType !== ServiceProductLinkType.POST) continue;
        const slug = slugById.get(record.fields.linkPostId as string);
        if (slug) hrefs.set(record.id, `/bai-viet/${slug}`);
      }
    }

    for (const record of records) {
      if (record.fields.linkType === ServiceProductLinkType.EXTERNAL && record.fields.linkExternalUrl) {
        hrefs.set(record.id, record.fields.linkExternalUrl as string);
      }
    }

    return hrefs;
  }

  private existingIds(table: 'products' | 'posts', ids: string[]): Promise<IdSlugRow[]> {
    return this.dataSource.query(
      `SELECT id, slug FROM ${table} WHERE id = ANY($1) AND deleted_at IS NULL`,
      [ids],
    );
  }
}
