import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductTranslation } from '../entities/product-translation.entity';
import { Product } from '../entities/product.entity';

export interface ProductAggregateParts {
  translations: Map<string, ProductTranslation[]>;
  prices: Map<string, ProductPrice[]>;
}

// One query per child table for a whole page of products, so listings never fan out per row
@Injectable()
export class ProductDataRepository {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductTranslation)
    private readonly translations: Repository<ProductTranslation>,
    @InjectRepository(ProductPrice) private readonly prices: Repository<ProductPrice>,
    @InjectRepository(ProductImage) private readonly images: Repository<ProductImage>,
  ) {}

  async findProductsInOrder(ids: readonly string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const found = await this.products.find({ where: { id: In([...ids]) } });
    const byId = new Map(found.map((product) => [product.id, product]));
    return ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
  }

  async loadParts(productIds: readonly string[]): Promise<ProductAggregateParts> {
    if (productIds.length === 0) return { translations: new Map(), prices: new Map() };
    const [translationRows, priceRows] = await Promise.all([
      this.translations.find({ where: { productId: In([...productIds]) } }),
      this.prices.find({
        where: { productId: In([...productIds]) },
        order: { currency: 'ASC', billingPeriod: 'ASC' },
      }),
    ]);
    return {
      translations: groupBy(translationRows, (row) => row.productId),
      prices: groupBy(priceRows, (row) => row.productId),
    };
  }

  async loadGallery(productIds: readonly string[]): Promise<Map<string, ProductImage[]>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.images.find({
      where: { productId: In([...productIds]) },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return groupBy(rows, (row) => row.productId);
  }
}

function groupBy<Item>(items: readonly Item[], key: (item: Item) => string): Map<string, Item[]> {
  const grouped = new Map<string, Item[]>();
  for (const item of items) {
    const bucket = grouped.get(key(item));
    if (bucket) bucket.push(item);
    else grouped.set(key(item), [item]);
  }
  return grouped;
}
