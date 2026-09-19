import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { BillingPeriod } from '../enums/billing-period.enum';
import { Currency } from '../enums/currency.enum';
import { DemoMode } from '../enums/demo-mode.enum';
import { ProductType } from '../enums/product-type.enum';

export class ProductPriceResponseDto {
  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ example: '199.00' })
  amount!: string;

  @ApiProperty({ enum: BillingPeriod })
  billingPeriod!: BillingPeriod;

  @ApiProperty()
  isDefault!: boolean;
}

export class AdminProductPriceResponseDto extends ProductPriceResponseDto {
  @ApiProperty()
  id!: string;
}

export class ProductCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ProductType })
  type!: ProductType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  tagline!: string | null;

  @ApiProperty({ nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty()
  isFeatured!: boolean;

  @ApiProperty()
  priceOnRequest!: boolean;

  @ApiProperty()
  hasDemo!: boolean;

  @ApiProperty({ type: [ProductPriceResponseDto] })
  prices!: ProductPriceResponseDto[];
}

export class ProductDemoDto {
  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: DemoMode })
  mode!: DemoMode;
}

export class ProductSeoDto {
  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  keywords!: string | null;

  @ApiProperty({ nullable: true })
  canonicalUrl!: string | null;

  @ApiProperty()
  noIndex!: boolean;

  @ApiProperty({ nullable: true })
  ogImageUrl!: string | null;
}

export class ProductCategorySummaryDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;
}

export class PublicProductDetailDto extends ProductCardDto {
  @ApiProperty({ nullable: true })
  descriptionHtml!: string | null;

  @ApiProperty({ type: [String] })
  features!: string[];

  @ApiProperty({ type: [String] })
  galleryUrls!: string[];

  @ApiProperty({ type: [String] })
  techStack!: string[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  specifications!: Record<string, string | number>;

  @ApiProperty({ type: ProductDemoDto, nullable: true })
  demo!: ProductDemoDto | null;

  @ApiProperty({ type: ProductCategorySummaryDto, nullable: true })
  category!: ProductCategorySummaryDto | null;

  @ApiProperty({ nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ type: ProductSeoDto })
  seo!: ProductSeoDto;

  @ApiProperty({ type: [ProductCardDto] })
  related!: ProductCardDto[];
}

export class ProductSlugDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  updatedAt!: Date;
}

export class AdminProductTranslationDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  tagline!: string | null;

  @ApiProperty({ nullable: true })
  descriptionHtml!: string | null;

  @ApiProperty({ type: [String] })
  features!: string[];

  @ApiProperty({ nullable: true })
  seoTitle!: string | null;

  @ApiProperty({ nullable: true })
  seoDescription!: string | null;

  @ApiProperty({ nullable: true })
  seoKeywords!: string | null;

  @ApiProperty({ nullable: true })
  canonicalUrl!: string | null;

  @ApiProperty()
  noIndex!: boolean;

  @ApiProperty({ nullable: true })
  ogImageId!: string | null;
}

export class AdminProductListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ProductType })
  type!: ProductType;

  @ApiProperty({ enum: PublicationStatus })
  status!: PublicationStatus;

  @ApiProperty({ nullable: true })
  sku!: string | null;

  @ApiProperty()
  isFeatured!: boolean;

  @ApiProperty()
  priceOnRequest!: boolean;

  @ApiProperty({ nullable: true })
  categoryId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  names!: Record<string, string | null>;

  @ApiProperty({
    type: [String],
    description: 'Locales whose name, tagline or description is empty',
  })
  missingLocales!: string[];

  @ApiProperty({ nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty({ type: [AdminProductPriceResponseDto] })
  prices!: AdminProductPriceResponseDto[];

  @ApiProperty({ nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ nullable: true })
  authorId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  version!: number;
}

export class AdminGalleryItemDto {
  @ApiProperty()
  mediaAssetId!: string;

  @ApiProperty({ nullable: true })
  url!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class AdminProductDetailDto extends AdminProductListItemDto {
  @ApiProperty({ nullable: true })
  coverImageId!: string | null;

  @ApiProperty({ type: [AdminGalleryItemDto] })
  gallery!: AdminGalleryItemDto[];

  @ApiProperty({ nullable: true })
  demoUrl!: string | null;

  @ApiProperty({ enum: DemoMode })
  demoMode!: DemoMode;

  @ApiProperty({ type: [String] })
  techStack!: string[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  specifications!: Record<string, string | number>;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'object' } })
  translations!: Record<string, AdminProductTranslationDto>;
}

export class AdminProductCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'object' } })
  translations!: Record<string, { name: string; description: string | null }>;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PublicProductCategoryDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  productCount!: number;
}
