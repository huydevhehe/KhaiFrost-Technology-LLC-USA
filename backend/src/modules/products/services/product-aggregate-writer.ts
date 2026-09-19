import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { validationFailed } from '../../../common/exceptions/exception.factories';
import { sanitizeRichText } from '../../../common/utils/sanitize-rich-text';
import { ProductTranslationPatchDto } from '../dto/product-translation-input.dto';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductTranslation } from '../entities/product-translation.entity';
import { NormalizedPrice } from '../utils/normalize-prices';

export type TranslationPatches = Partial<Record<Locale, ProductTranslationPatchDto | undefined>>;

const SEO_FIELDS = [
  'seoTitle',
  'seoDescription',
  'seoKeywords',
  'canonicalUrl',
  'noIndex',
  'ogImageId',
] as const;

function cleanFeatures(features: string[]): string[] {
  return features.map((feature) => feature.trim()).filter((feature) => feature.length > 0);
}

// Child rows of the product aggregate; every method runs on the caller's transaction manager
@Injectable()
export class ProductAggregateWriter {
  collectOgImageIds(patches: TranslationPatches): string[] {
    return SUPPORTED_LOCALES.flatMap((locale) => {
      const id = patches[locale]?.ogImageId;
      return id ? [id] : [];
    });
  }

  // Keeps price row ids stable (carts point at them): update in place by (currency, billingPeriod)
  async replacePrices(
    manager: EntityManager,
    productId: string,
    prices: readonly NormalizedPrice[],
  ): Promise<void> {
    const existing = await manager.find(ProductPrice, { where: { productId } });
    const keyOf = (price: { currency: string; billingPeriod: string }) =>
      `${price.currency}:${price.billingPeriod}`;
    const wanted = new Map(prices.map((price) => [keyOf(price), price]));

    const removedIds = existing.filter((row) => !wanted.has(keyOf(row))).map((row) => row.id);
    if (removedIds.length > 0) await manager.delete(ProductPrice, { id: In(removedIds) });
    // Cleared first so moving the default between rows cannot trip the partial unique index
    await manager.update(ProductPrice, { productId }, { isDefault: false });

    const existingByKey = new Map(existing.map((row) => [keyOf(row), row]));
    for (const price of prices) {
      const current = existingByKey.get(keyOf(price));
      if (current) {
        await manager.update(
          ProductPrice,
          { id: current.id },
          { amount: price.amount, isDefault: price.isDefault },
        );
      } else {
        await manager.insert(ProductPrice, { productId, ...price });
      }
    }
  }

  async replaceGallery(
    manager: EntityManager,
    productId: string,
    mediaAssetIds: readonly string[],
  ): Promise<void> {
    await manager.delete(ProductImage, { productId });
    if (mediaAssetIds.length === 0) return;
    await manager.insert(
      ProductImage,
      mediaAssetIds.map((mediaAssetId, sortOrder) => ({ productId, mediaAssetId, sortOrder })),
    );
  }

  async upsertTranslations(
    manager: EntityManager,
    productId: string,
    patches: TranslationPatches,
  ): Promise<void> {
    const existingRows = await manager.find(ProductTranslation, { where: { productId } });
    for (const locale of SUPPORTED_LOCALES) {
      const patch = patches[locale];
      if (!patch) continue;

      const row =
        existingRows.find((item) => item.locale === locale) ??
        manager.create(ProductTranslation, {
          productId,
          locale,
          tagline: null,
          descriptionHtml: null,
          features: [],
        });
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (!row.name) {
        throw validationFailed([
          { field: `translations.${locale}.name`, messages: ['name is required'] },
        ]);
      }
      if (patch.tagline !== undefined) row.tagline = patch.tagline?.trim() || null;
      if (patch.descriptionHtml !== undefined) {
        row.descriptionHtml = patch.descriptionHtml
          ? sanitizeRichText(patch.descriptionHtml)
          : null;
      }
      if (patch.features !== undefined) row.features = cleanFeatures(patch.features);
      for (const field of SEO_FIELDS) {
        const value = patch[field];
        if (value !== undefined)
          Object.assign(row, { [field]: value ?? (field === 'noIndex' ? false : null) });
      }
      await manager.save(ProductTranslation, row);
    }
  }
}
