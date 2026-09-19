import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { ProductCategoriesAdminController } from './controllers/product-categories-admin.controller';
import { ProductCategoriesPublicController } from './controllers/product-categories-public.controller';
import { ProductsAdminController } from './controllers/products-admin.controller';
import { ProductsPublicController } from './controllers/products-public.controller';
import { ProductCategoryTranslation } from './entities/product-category-translation.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductPrice } from './entities/product-price.entity';
import { ProductTranslation } from './entities/product-translation.entity';
import { Product } from './entities/product.entity';
import { ProductDataRepository } from './repositories/product-data.repository';
import { ProductAggregateWriter } from './services/product-aggregate-writer';
import { ProductCategoriesService } from './services/product-categories.service';
import { ProductsAdminService } from './services/products-admin.service';
import { ProductsService } from './services/products.service';

@Module({
  imports: [
    MediaModule,
    TypeOrmModule.forFeature([
      Product,
      ProductTranslation,
      ProductPrice,
      ProductImage,
      ProductCategory,
      ProductCategoryTranslation,
    ]),
  ],
  controllers: [
    ProductsPublicController,
    ProductsAdminController,
    ProductCategoriesPublicController,
    ProductCategoriesAdminController,
  ],
  providers: [
    ProductsService,
    ProductsAdminService,
    ProductCategoriesService,
    ProductDataRepository,
    ProductAggregateWriter,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
